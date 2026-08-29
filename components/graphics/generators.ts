/**
 * The six background generators, each split into `sample` and `project`.
 *
 * ## Why the split exists
 *
 * `rng.ts` guarantees *determinism*: same params ⇒ byte-identical SVG. Animation
 * needs a strictly stronger property — *coherence*: adjacent inputs ⇒ adjacent
 * images. Determinism does not imply it, and these generators originally did not
 * have it, for a reason that is easy to miss:
 *
 * The rng stream is **positional**. It is consumed inline, in draw order, inside
 * loops whose bounds derive from `density`. Nudge `density` and `spacing`
 * changes, the cell count changes, and every subsequent draw shifts one position
 * down the stream — so the entire composition re-rolls. Each frame is
 * individually valid and the sequence is confetti.
 *
 * Confining the rng to `sample()` is what fixes that. `sample` depends on
 * everything except `t`; `project` is pure arithmetic and draws no randomness.
 * A frame renderer varies only `t`, so the structure it is drawing is provably
 * the same structure from one frame to the next.
 *
 * `density` still must not be animated — it changes what `sample` produces, by
 * design. Interpolating between two sampled structures is the way to do that,
 * and is deliberately not attempted here.
 *
 * ## The two invariants, and why the arithmetic looks the way it does
 *
 * Every motion term goes through {@link wobble} or a whole-cycle phase shift, so
 * that:
 *
 *  1. **`t = 0` is the static image.** Motion terms are written as `f(t) − f(0)`
 *     rather than `f(t)`, so at `t = 0` every one of them is exactly zero and the
 *     generator emits the byte-identical SVG it always did. That is not a trick
 *     to keep a test green — it means the video's first frame *is* the still the
 *     site already renders, and it is what lets `tests/graphics-generators.test.ts`
 *     pin the pre-animation output as a golden.
 *
 *  2. **`t = 1` is `t = 0`.** Every cycle count is an integer, so `sin(2πk + φ)`
 *     returns to `sin(φ)`. A composition driven as `frame / durationInFrames`
 *     therefore loops seamlessly. A *fractional* multiplier breaks this and
 *     produces a jump at the loop point that reads as an encoding glitch rather
 *     than as a bug here — hence {@link cycles}, which cannot return a float.
 *
 * Both are asserted in `tests/graphics-generators.test.ts`.
 *
 * ## Adding motion without moving the stream
 *
 * Motion parameters are *derived* from values already sampled, never drawn
 * fresh. A new `rng()` call inside `sample` would shift every subsequent draw
 * and re-roll the composition — the exact failure the split exists to prevent,
 * reintroduced by the code adding the animation.
 */
import { withAlpha } from './palette';
import { chance, intRange, mulberry32, type Rng, range } from './rng';
import type { GraphicParams, SampledGenerator } from './types';

/** Linear interpolate — used to map density (0..1) onto per-generator ranges. */
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r2 = (n: number) => Math.round(n * 100) / 100;

const TAU = Math.PI * 2;

/**
 * Whole cycles per loop, derived from an already-sampled value.
 *
 * Integer by construction: `sin(θ + t·2π·k)` returns to its `t = 0` value at
 * `t = 1` only when `k` is an integer, so this is the reason the loop closes.
 * Returns 1..max.
 */
const cycles = (v: number, max = 3): number =>
  1 + (Math.floor(Math.abs(v) * 1000) % max);

/**
 * A motion term that is zero at both `t = 0` and `t = 1`.
 *
 * `sin(t·2π·k + φ) − sin(φ)`. The subtracted term is what makes `t = 0` the
 * static image; the integer `k` is what makes `t = 1` return to it.
 */
const wobble = (t: number, k: number, phase: number): number =>
  Math.sin(t * TAU * k + phase) - Math.sin(phase);

/**
 * How far a mark travels, as a fraction of the space it has.
 *
 * These are tuned against a measurement, not by eye: `tests/graphics-generators
 * .test.ts` asserts a floor on peak displacement, because the first pass picked
 * amplitudes like 0.18 and 0.12 that were arithmetically correct and visually
 * nothing — `dot-grid` peaked at 2.35px and moved 1.2% of its marks, which
 * reads as a still image. A generator that satisfies every coherence property
 * and does not visibly move has not been animated.
 */
const ORBIT_OF_CELL = 0.13;
const DRIFT_OF_FRAME = 0.035;

/** Wrap generator marks in a themed <svg> with optional backdrop + opacity. */
function frame(params: GraphicParams, inner: string): string {
  const { width, height, opacity, background } = params;
  const bg =
    background && background !== 'transparent'
      ? `<rect width="${width}" height="${height}" fill="${background}"/>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" role="img">${bg}<g opacity="${opacity}">${inner}</g></svg>`;
}

/* ── dot-grid ─────────────────────────────────────────────────────────────── */

interface Dot {
  x: number;
  y: number;
  rad: number;
  hot: boolean;
}

/** Grid of dots with jittered radius; a scatter of them flare to full accent. */
const dotGrid: SampledGenerator<Dot[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const spacing = lerp(96, 34, p.density);
    const dots: Dot[] = [];
    for (let y = spacing / 2; y < p.height; y += spacing) {
      for (let x = spacing / 2; x < p.width; x += spacing) {
        const hot = chance(rng, 0.06 + p.density * 0.14);
        const rad =
          (hot ? range(rng, 2.5, 4.5) : range(rng, 1, 2.4)) * (spacing / 40);
        dots.push({ x, y, rad, hot });
      }
    }
    return dots;
  },
  // Each dot orbits inside its own cell. The lattice cannot translate as a
  // whole — its marks are individually sampled, so sliding it by one cell would
  // pair every position with a different dot — but a per-dot orbit bounded by
  // the cell moves plainly without ever colliding or leaving a bare edge.
  project: (dots, p, t) => {
    const faint = withAlpha(p.accent, 0.4);
    const bright = withAlpha(p.accent, 0.95);
    const orbit = lerp(96, 34, p.density) * ORBIT_OF_CELL;
    let out = '';
    for (const d of dots) {
      const k = cycles(d.rad, 2);
      const phase = (d.x + d.y) * 0.01;
      const cx = d.x + orbit * wobble(t, k, phase);
      const cy = d.y + orbit * wobble(t, k, phase + Math.PI / 2);
      const rad = d.rad * (1 + 0.4 * wobble(t, k, phase));
      out += `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(rad)}" fill="${d.hot ? bright : faint}"/>`;
    }
    return frame(p, out);
  },
};

/* ── diagonal-hatch ───────────────────────────────────────────────────────── */

interface Rule {
  o: number;
  w: number;
  hot: boolean;
}

/** Parallel 45° rules; a few lines pop to accent, the rest stay ghostly. */
const diagonalHatch: SampledGenerator<Rule[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const gap = lerp(70, 20, p.density);
    const rules: Rule[] = [];
    for (let o = -p.height; o < p.width; o += gap) {
      const hot = chance(rng, 0.12);
      // Deliberately mirrors the original ternary: `range` is not evaluated
      // when `hot`, so a hot line consumes one draw and a cold line two.
      // Reordering this would shift the stream and re-roll every later line.
      const w = hot
        ? p.strokeWidth * 2.5
        : p.strokeWidth * range(rng, 0.5, 1.1);
      rules.push({ o, w, hot });
    }
    return rules;
  },
  // The one field that can translate wholesale: every rule is the same infinite
  // 45 degree line, generated from -height to width so the set overruns both
  // edges. Sliding it reveals no bare margin, and unlike a grid there is no
  // per-mark identity to mismatch — so this is the most legible motion in the
  // set, and the cheapest.
  project: (rules, p, t) => {
    const faint = withAlpha(p.accent, 0.32);
    const bright = withAlpha(p.accent, 0.9);
    const slide = lerp(70, 20, p.density) * 0.9 * wobble(t, 1, 0);
    let out = '';
    for (const rule of rules) {
      const o = rule.o + slide;
      const w =
        rule.w * (1 + 0.3 * wobble(t, cycles(rule.w, 2), rule.o * 0.02));
      out += `<line x1="${r2(o)}" y1="0" x2="${r2(o + p.height)}" y2="${p.height}" stroke="${rule.hot ? bright : faint}" stroke-width="${r2(w)}"/>`;
    }
    return frame(p, out);
  },
};

/* ── node-network ─────────────────────────────────────────────────────────── */

interface Node {
  x: number;
  y: number;
  rad: number;
}

interface Network {
  nodes: Node[];
  /** Index pairs, sampled once from the *base* positions. */
  edges: [number, number][];
}

/** Constellation / circuit: scattered nodes wired to their nearest neighbours. */
const nodeNetwork: SampledGenerator<Network> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const count = Math.round(lerp(12, 64, p.density));
    const base = Array.from({ length: count }, () => ({
      x: range(rng, 0, p.width),
      y: range(rng, 0, p.height),
    }));

    // Topology is sampled from the base positions and then frozen. Recomputing
    // nearest neighbours per frame would rewire the graph as nodes drift, which
    // is incoherent in exactly the way this split exists to prevent — the
    // constellation would flicker between wirings rather than move.
    const edges: [number, number][] = [];
    for (let i = 0; i < base.length; i++) {
      const nearest = base
        .map((n, j) => ({
          j,
          d: (n.x - base[i].x) ** 2 + (n.y - base[i].y) ** 2,
        }))
        .filter((n) => n.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      for (const { j } of nearest) {
        if (j > i) edges.push([i, j]);
      }
    }

    // Radii are drawn after the edge pass in the original, and the edge pass
    // consumes no randomness, so this ordering reproduces the stream exactly.
    const nodes = base.map((n) => ({
      ...n,
      rad: chance(rng, 0.2) ? range(rng, 4, 7) : range(rng, 2, 3.5),
    }));

    return { nodes, edges };
  },
  project: ({ nodes, edges }, p, t) => {
    const edgeColor = withAlpha(p.accent, 0.35);
    const dotColor = withAlpha(p.accent, 0.95);
    const drift = Math.min(p.width, p.height) * DRIFT_OF_FRAME;

    // Each node orbits its sampled position. Edges are then drawn between the
    // *displaced* positions, so the wires follow the nodes instead of detaching.
    const at = nodes.map((n) => {
      const phase = (n.x + n.y) * 0.01;
      const k = cycles(n.rad, 2);
      return {
        x: n.x + drift * wobble(t, k, phase),
        y: n.y + drift * wobble(t, k, phase + Math.PI / 2),
        rad: n.rad,
      };
    });

    let lines = '';
    for (const [i, j] of edges) {
      lines += `<line x1="${r2(at[i].x)}" y1="${r2(at[i].y)}" x2="${r2(at[j].x)}" y2="${r2(at[j].y)}" stroke="${edgeColor}" stroke-width="${p.strokeWidth}"/>`;
    }
    let dots = '';
    for (const n of at) {
      dots += `<circle cx="${r2(n.x)}" cy="${r2(n.y)}" r="${r2(n.rad)}" fill="${dotColor}"/>`;
    }
    return frame(p, lines + dots);
  },
};

/* ── contour ──────────────────────────────────────────────────────────────── */

interface Band {
  base: number;
  amp: number;
  freq: number;
  phase: number;
  hot: boolean;
}

/**
 * Stacked topographic waves; a couple of bands rise to full accent.
 *
 * The one generator that was already built to animate: `amp`, `freq` and
 * `phase` are sampled per band and then evaluated as a sine along x, so
 * advancing the phase by whole cycles makes the whole stack flow with no change
 * to sampling at all. Each band advances at its own integer rate, so the stack
 * parallaxes and still closes at `t = 1`.
 */
const contourLines: SampledGenerator<Band[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const count = Math.round(lerp(6, 26, p.density));
    const bands: Band[] = [];
    for (let i = 0; i < count; i++) {
      bands.push({
        base: ((i + 0.5) * p.height) / count,
        amp: range(rng, 6, 30),
        freq: range(rng, 1.2, 3.2),
        phase: range(rng, 0, TAU),
        hot: chance(rng, 0.15),
      });
    }
    return bands;
  },
  project: (bands, p, t) => {
    const step = p.width / 48;
    let out = '';
    for (const b of bands) {
      const stroke = b.hot
        ? withAlpha(p.accent, 0.9)
        : withAlpha(p.accent, 0.32);
      // A travelling wave rather than a wobble: the phase advances by whole
      // cycles over the loop, so the crests move across the frame and land back
      // where they started.
      const phase = b.phase + t * TAU * cycles(b.freq);
      let d = '';
      for (let x = 0; x <= p.width; x += step) {
        const y =
          b.base + Math.sin((x / p.width) * TAU * b.freq + phase) * b.amp;
        d += `${x === 0 ? 'M' : 'L'}${r2(x)} ${r2(y)} `;
      }
      out += `<path d="${d.trim()}" fill="none" stroke="${stroke}" stroke-width="${b.hot ? p.strokeWidth * 1.8 : p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
};

/* ── iso-grid ─────────────────────────────────────────────────────────────── */

interface Cell {
  cx: number;
  cy: number;
  flare: boolean;
  filled: boolean;
}

/** Isometric lattice of diamonds; some cells fill with faint accent. */
const isoGrid: SampledGenerator<Cell[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cw = lerp(120, 52, p.density);
    const ch = cw * 0.58;
    const cells: Cell[] = [];
    for (let row = -1; row * ch * 0.5 < p.height + ch; row++) {
      for (let col = -1; col * cw < p.width + cw; col++) {
        const flare = chance(rng, 0.05 + p.density * 0.1);
        // The original nests the second draw inside a ternary, so a flaring
        // cell never makes it. Preserving that short-circuit is what keeps the
        // stream — and therefore every later cell — identical.
        const filled = flare ? false : chance(rng, 0.12);
        cells.push({
          cx: col * cw + (row % 2 ? cw / 2 : 0),
          cy: (row * ch) / 2,
          flare,
          filled,
        });
      }
    }
    return cells;
  },
  project: (cells, p, t) => {
    const cw = lerp(120, 52, p.density);
    const ch = cw * 0.58;
    const line = withAlpha(p.accent, 0.36);
    const fill = withAlpha(p.accent, 0.22);
    const hot = withAlpha(p.accent, 0.85);
    let out = '';
    for (const c of cells) {
      // The lattice cannot move without tearing, so the diamonds themselves
      // breathe about their centres.
      const s =
        1 + 0.3 * wobble(t, cycles(c.cx + c.cy, 2), (c.cx - c.cy) * 0.01);
      const hw = (cw / 2) * s;
      const hh = (ch / 2) * s;
      const path = `M${r2(c.cx)} ${r2(c.cy - hh)} L${r2(c.cx + hw)} ${r2(c.cy)} L${r2(c.cx)} ${r2(c.cy + hh)} L${r2(c.cx - hw)} ${r2(c.cy)} Z`;
      out += `<path d="${path}" fill="${c.flare ? hot : c.filled ? fill : 'none'}" stroke="${line}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
};

/* ── scatter-blocks ───────────────────────────────────────────────────────── */

interface Block {
  x: number;
  y: number;
  size: number;
  rot: number;
  roll: number;
}

/** Brutalist confetti: scattered rotated squares — outlined, faint, or solid. */
const scatterBlocks: SampledGenerator<Block[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const count = Math.round(lerp(14, 76, p.density));
    const blocks: Block[] = [];
    for (let i = 0; i < count; i++) {
      const x = range(rng, 0, p.width);
      const y = range(rng, 0, p.height);
      const size = range(rng, 8, 46);
      const rot = intRange(rng, 0, 45);
      blocks.push({ x, y, size, rot, roll: rng() });
    }
    return blocks;
  },
  project: (blocks, p, t) => {
    const outline = withAlpha(p.accent, 0.5);
    const faint = withAlpha(p.accent, 0.22);
    const solid = withAlpha(p.accent, 0.95);
    let out = '';
    for (const b of blocks) {
      const style =
        b.roll < 0.18
          ? `fill="${solid}"`
          : b.roll < 0.5
            ? `fill="${faint}"`
            : `fill="none" stroke="${outline}" stroke-width="${p.strokeWidth}"`;
      // A rock, not a spin. Whole turns would also close the loop, but only
      // *geometrically* — `rot + 720` and `rot` draw the same square while
      // being different strings, and normalising with `% 360` trades that for a
      // 360-unit jump at the wrap point, which is a discontinuity in everything
      // downstream even though the image is smooth. Oscillating keeps one rule
      // for the whole file and no exceptions in the tests. It also reads better:
      // two full revolutions per loop is fast enough to pull the eye off
      // whatever the background is sitting behind.
      const k = cycles(b.size, 2);
      const phase = b.roll * TAU;
      const swing = 40 * (b.roll < 0.5 ? 1 : -1);
      // Rotation alone moves one number per block, so the frame stayed almost
      // still even at 48px of peak swing — the corners travelled, nothing a
      // viewer tracks did. Drifting the block puts the motion into the
      // coordinates as well.
      const x = b.x + DRIFT_OF_FRAME * 320 * wobble(t, k, phase);
      const y = b.y + DRIFT_OF_FRAME * 320 * wobble(t, k, phase + Math.PI / 2);
      // Rounded like every other emitted number. Without it the loop closes
      // geometrically but not textually: `sin(2πk + φ)` differs from `sin(φ)` in
      // the last few bits, and this is the one value the original printed raw.
      const rot = r2(b.rot + swing * wobble(t, k, phase));
      out += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(b.size)}" height="${r2(b.size)}" transform="rotate(${rot} ${r2(x + b.size / 2)} ${r2(y + b.size / 2)})" ${style}/>`;
    }
    return frame(p, out);
  },
};

/* ── registry ─────────────────────────────────────────────────────────────── */

/** The split form, for renderers that want to sample once and project per frame. */
export const SAMPLED_GENERATORS = {
  'dot-grid': dotGrid,
  'diagonal-hatch': diagonalHatch,
  'node-network': nodeNetwork,
  contour: contourLines,
  'iso-grid': isoGrid,
  'scatter-blocks': scatterBlocks,
};

export type GeneratorName = keyof typeof SAMPLED_GENERATORS;

export type { Rng };
