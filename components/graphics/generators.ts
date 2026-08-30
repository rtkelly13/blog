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
import { type LatticeCell, lattice, scaledPath } from './lattice';
import { mix, withAlpha } from './palette';
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
/**
 * Which multiples of `f0` a ridge's harmonics take.
 *
 * Non-consecutive, to break the plain 1,2,3 series that made every period an
 * identical spike — but capped at 5 rather than the 7 tried first. The
 * projection samples 192 times across the frame and `1 - |sin|` peaks twice per
 * period, so the top harmonic has to stay under about 32 or its corners alias
 * into noise; `f0 = 5` with a 7 step reaches 35 and does exactly that.
 */
const HARMONIC_STEPS = [1, 2, 5];

/**
 * Arc a spoke tip sweeps per loop, as a fraction of the wheel's reach.
 *
 * Tuned against the measurement rather than by eye — see the note in
 * `radial-spokes`' `project`. It is an arc length, not an angle, because
 * equalising arc across radius is the whole point.
 */
const SPOKE_ARC = 0.2;

const ORBIT_OF_CELL = 0.13;
const DRIFT_OF_FRAME = 0.035;

/**
 * Deterministic value in [-1, 1) from a pair of coordinates.
 *
 * Not an rng draw, and that is the entire point. `disorder` is sampled, so it
 * has to perturb positions from *inside* `sample` — and drawing for it would
 * shift the stream and re-roll every later mark, which is the failure this
 * module exists to prevent, reintroduced by the parameter meant to improve it.
 * Hashing the coordinates instead means `disorder = 0` consumes exactly the
 * randomness the generator always did, so not one golden moves.
 */
const scramble = (x: number, y: number, salt: number): number => {
  const n = Math.sin(x * 12.9898 + y * 78.233 + salt * 43.7585) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
};

/**
 * How far into the disorder ramp a point is — 0 at the top edge, `disorder` at
 * the bottom.
 *
 * The ramp is what separates this from jitter. A uniform perturbation is
 * texture, and the eye stops reading it within about a second; a gradient from
 * strict lattice to chaos is a *composition*, with somewhere to start and
 * somewhere to end up. Squared, so the ordered end holds on rather than
 * degrading from the first row — the top of `flow_dots` is a convincing grid
 * for a third of its height, and that contrast is the whole effect.
 */
const disorderAt = (p: GraphicParams, y: number): number =>
  p.disorder <= 0
    ? 0
    : p.disorder * Math.min(1, Math.max(0, y / p.height)) ** 2;

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
        // The strict grid comes apart as it falls. Bounded by roughly one cell,
        // so the lattice dissolves rather than turning into a scatter that
        // happens to have started as a grid.
        const chaos = disorderAt(p, y);
        dots.push({
          x: x + chaos * spacing * 0.95 * scramble(x, y, 1),
          y: y + chaos * spacing * 0.6 * scramble(x, y, 2),
          rad,
          hot,
        });
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
        const cx = col * cw + (row % 2 ? cw / 2 : 0);
        const cy = (row * ch) / 2;
        const chaos = disorderAt(p, cy);
        cells.push({
          cx: cx + chaos * cw * 0.5 * scramble(cx, cy, 3),
          cy: cy + chaos * ch * 0.5 * scramble(cx, cy, 4),
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

/* ── hex-grid ─────────────────────────────────────────────────────────────── */

interface Tiled {
  cells: LatticeCell[];
  /** Per-cell roll, so a generator can vary a tiling without re-drawing it. */
  rolls: number[];
}

/**
 * A wave sweeping across a tiling.
 *
 * Grid generators wobble each mark independently, which reads as texture rather
 * than motion. A tiling can do better: drive every cell from one field that
 * depends on where the cell is, and the whole surface moves together.
 *
 * `k` is cycles across the frame and `m` whole cycles per loop, so this closes
 * at `t = 1` for the same reason `contour` does. Returns 0..1.
 */
const wave = (u: number, t: number, k: number, m: number): number =>
  (Math.sin(u * TAU * k + t * TAU * m) + 1) / 2;

/** Honeycomb, lit by a wave crossing it. */
const hexGrid: SampledGenerator<Tiled> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cells = lattice('hex', {
      width: p.width,
      height: p.height,
      size: lerp(78, 30, p.density),
    });
    // One draw per cell, in lattice order — the rng decides which cells are
    // interesting, the lattice decides where they are, and the two stay
    // independent so a density change moves cells without re-rolling them all.
    return { cells, rolls: cells.map(() => rng()) };
  },
  project: ({ cells, rolls }, p, t) => {
    const line = withAlpha(p.accent, 0.3);
    let out = '';
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      // Two waves at coprime rates, one horizontal and one diagonal, so the
      // pattern never settles into an obvious stripe.
      const a = wave(c.cx / p.width, t, 2, 1);
      const b = wave((c.cx + c.cy) / (p.width + p.height), t, 3, 2);
      const energy = (a + b) / 2;
      // Every cell always carries a fill, and only its alpha moves.
      //
      // Thresholding this field into lit/unlit was the obvious way to write it
      // and is wrong: `fill="none"` and `fill="rgba(…)"` are different shapes,
      // so a cell crossing the threshold pops rather than fades. `iso-grid` gets
      // away with the same ternary because what it switches on is *sampled* and
      // therefore never changes mid-loop; this field varies with `t`, so it
      // cannot be. The coherence suite catches it as a change in mark count.
      const weight = 1 - rolls[i];
      const d = scaledPath(c, 0.72 + energy * 0.26, r2);
      out += `<path d="${d}" fill="${withAlpha(p.accent, r2(0.02 + weight * energy * 0.6))}" stroke="${line}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
};

/* ── triangle-grid ────────────────────────────────────────────────────────── */

/**
 * Alternating triangles, the two orientations driven in antiphase.
 *
 * The up- and down-pointing cells are offset by half a cycle, so the surface
 * shimmers between two interlocking states rather than pulsing as one — which
 * is the thing a triangular tiling can do that a square one cannot.
 */
const triangleGrid: SampledGenerator<Tiled> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cells = lattice('triangle', {
      width: p.width,
      height: p.height,
      size: lerp(150, 62, p.density),
    });
    return { cells, rolls: cells.map(() => rng()) };
  },
  project: ({ cells, rolls }, p, t) => {
    const line = withAlpha(p.accent, 0.26);
    let out = '';
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const u = (c.cx / p.width + c.cy / p.height) / 2;
      // The half-turn offset is the whole idea: the two orientations are never
      // bright at once.
      const energy = wave(u + (c.flipped ? 0.5 : 0), t, 2, 1);
      // Continuous alpha, for the reason spelled out in `hex-grid`.
      const weight = 1 - rolls[i];
      const d = scaledPath(c, 0.62 + energy * 0.34, r2);
      out += `<path d="${d}" fill="${withAlpha(p.accent, r2(0.02 + weight * energy * 0.62))}" stroke="${line}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
};

/* ── ridgeline ────────────────────────────────────────────────────────────── */

interface Harmonic {
  /** Whole cycles across the frame — integer, so the ridge is periodic. */
  freq: number;
  amp: number;
  phase: number;
}

interface Ridge {
  /** Horizon height for this layer, as a fraction of the frame. */
  base: number;
  harmonics: Harmonic[];
  /**
   * Frame-widths per loop — `1/f0`, a fraction rather than a whole width.
   * Back ranges drift slower; that is the parallax.
   */
  speed: number;
}

/**
 * Layered mountains, angular rather than rolling.
 *
 * ## How the loop closes, and why that used to make it too fast
 *
 * A ridge slides by adding to the coordinate before the frequency multiplies
 * it: `u = x/W + t·speed`. At `t = 1` every harmonic has advanced by
 * `freq · speed` cycles, so the range lands exactly where it started **provided
 * that product is a whole number**.
 *
 * With arbitrary integer frequencies that forces `speed` itself to be an
 * integer — and one whole frame-width per loop is already a brisk drift, so the
 * slowest range this could draw was too fast and the fastest crossed three
 * widths and blurred.
 *
 * Deriving every harmonic in a layer from one base `f0` removes the constraint.
 * The frequencies are `f0, 2·f0, 3·f0`, so `speed = 1/f0` still gives a whole
 * number of cycles on each, and a range can now creep at an eighth of a width.
 *
 * ## One parameter, two cues, and they agree
 *
 * `f0` is also what sets a range's detail — more peaks for higher `f0`. Distant
 * mountains read as many small peaks *and* barely move; near ones as few large
 * peaks that travel. Both fall out of the same number in the same direction, so
 * the parallax and the aerial perspective cannot drift apart: they are the same
 * parameter.
 *
 * Far ranges take `f0 ≈ 8` and drift 0.125 frame-widths per loop; near ones
 * `f0 ≈ 3` and 0.333. A 2.7x spread, and nothing crosses the frame.
 *
 * ## Peaks, not hills
 *
 * `1 - |sin θ|` rather than `sin θ`: the absolute value puts a corner at every
 * zero crossing, and harmonics with decaying amplitude give a self-similar
 * profile with no noise function anywhere.
 *
 * Three harmonics sampled 192 times, not four sampled 96. `1 - |sin|` peaks
 * twice per period, so a far range's top harmonic of 24 puts 48 peaks across
 * the frame; below about four samples per peak the corners alias into noise,
 * which is the opposite of a crisp silhouette.
 */
const ridgeline: SampledGenerator<Ridge[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const layers = Math.round(lerp(3, 7, p.density));
    const ridges: Ridge[] = [];
    for (let i = 0; i < layers; i++) {
      const depth = i / Math.max(1, layers - 1); // 0 = furthest, 1 = nearest
      // The one number deciding both how fine this range is and how slowly it
      // drifts. Jittered upward by at most one, so seeds differ without the
      // far-to-near ordering inverting.
      // Repeats across the frame, and the reason this is low.
      //
      // Every harmonic must be a whole multiple of `f0` for the loop to close,
      // which makes a range's silhouette periodic with period `1/f0` — that is
      // unavoidable, so the fix is to have *few* periods rather than to pretend
      // there are none. At `f0 = 8` a far range put sixteen near-identical
      // peaks across the frame and read as a comb; at 2–4 the repeat is hard to
      // pick out, and `speed = 1/f0` still stays under half a frame-width.
      // No random term any more. It was `+ intRange(rng, 0, 1)`, which was
      // survivable at the old 8..3 spread and is not at 5..3: adjacent layers
      // often share a base, so a single random step inverts their parallax and
      // a far range overtakes a near one. Seed variety comes from the
      // amplitudes and phases below; the depth ladder stays strictly ordered.
      // The floor of 3 also matters — `f0 = 2` gives `speed = 0.5` exactly,
      // and the drift bound is strict.
      const f0 = Math.round(lerp(5, 3, depth));
      const harmonics: Harmonic[] = [];
      for (let h = 0; h < 3; h++) {
        harmonics.push({
          // Every harmonic a multiple of f0 — that is what lets `speed` be a
          // fraction and still land the loop. Sparse, non-consecutive
          // multiples rather than 1,2,3: the sum is periodic either way, but a
          // plain harmonic series makes every period an identical symmetrical
          // spike, and skipping steps gives the profile within one period some
          // structure to look at.
          freq: f0 * HARMONIC_STEPS[h],
          // Halving per harmonic, not `1/(h + 1)`. The gentler decay left the
          // overtones nearly as loud as the fundamental, which is what turned
          // terrain into a comb — real relief is self-similar, so each octave
          // must contribute meaningfully less than the one below it.
          amp: range(rng, 0.8, 1.2) / 2 ** h,
          phase: range(rng, 0, TAU),
        });
      }
      ridges.push({
        base: lerp(0.42, 0.96, depth),
        harmonics,
        // Frame-widths per loop. `1/f0` is a whole number of cycles on every
        // harmonic, so the range closes; and because f0 falls as the range
        // nears, this rises — the parallax comes free.
        speed: 1 / f0,
      });
    }
    return ridges;
  },
  project: (ridges, p, t) => {
    const step = p.width / 192;
    let out = '';
    for (let i = 0; i < ridges.length; i++) {
      const r = ridges[i];
      const depth = ridges.length === 1 ? 1 : i / (ridges.length - 1);
      // Depth is carried by contrast, not perspective: far ranges are faint and
      // thin, near ranges bright and heavy.
      const stroke = withAlpha(p.accent, 0.22 + depth * 0.68);
      // Opaque, so a near range hides the ones behind it.
      //
      // This was `withAlpha(p.accent, 0.04 + depth * 0.07)` — alpha 0.04 to
      // 0.11, through which every far range stayed fully visible. The layers
      // were stacked in draw order and occluded nothing, so depth was carried
      // entirely by stroke contrast and the result read as a pile of
      // overlapping line charts. Mountains hide what is behind them, and that
      // is most of what makes a range look like distance rather than noise.
      const fillA = mix(p.occlusion, p.accent, 0.05 + depth * 0.12);
      const relief = lerp(0.3, 0.12, depth) * p.height;

      let d = `M0 ${p.height} `;
      for (let x = 0; x <= p.width; x += step) {
        let sum = 0;
        let norm = 0;
        // The drift is added to `x` before the frequency multiplies it, not to
        // the phase afterwards. That distinction is the whole difference between
        // a range that *translates* and one that *morphs*: a flat phase offset
        // advances every harmonic by the same angle, so the fast ones slide
        // further than the slow ones and the silhouette boils. Shifting the
        // coordinate moves them together.
        const u = x / p.width + t * r.speed;
        for (const h of r.harmonics) {
          const th = u * TAU * h.freq + h.phase;
          sum += h.amp * (1 - Math.abs(Math.sin(th)));
          norm += h.amp;
        }
        const y = r.base * p.height - (sum / norm) * relief;
        d += `L${r2(x)} ${r2(y)} `;
      }
      d += `L${p.width} ${p.height} Z`;
      out += `<path d="${d.trim()}" fill="${fillA}" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (0.6 + depth * 1.2))}" stroke-linejoin="miter"/>`;
    }
    return frame(p, out);
  },
};

/* ── radial-spokes ────────────────────────────────────────────────────────── */

interface Spoke {
  angle: number;
  inner: number;
  outer: number;
  hot: boolean;
}

interface Wheel {
  spokes: Spoke[];
  rings: { r: number; hot: boolean }[];
  cx: number;
  cy: number;
  reach: number;
}

/**
 * Spokes and rings about a centre.
 *
 * The first generator here that is not Cartesian, and that is the point. Every
 * other one draws edge-to-edge uniform texture — a grid, a lattice, a stack of
 * bands — which can sit behind anything because it emphasises nothing. This one
 * has a middle, so it can sit *behind a title* and point at it.
 *
 * Motion is a sweep: the whole wheel advances by whole turns, which closes the
 * loop for the same reason every other generator does, except the angle is
 * consumed by `cos`/`sin` rather than printed. That matters — a `rotate()`
 * transform would print `360` at `t = 1` against `0` at `t = 0`, geometrically
 * identical and textually different, which is the trap `scatter-blocks`
 * documents. Coordinates have no such wrap.
 */
const radialSpokes: SampledGenerator<Wheel> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cx = p.width / 2;
    const cy = p.height / 2;
    // Reach past the corner, so the wheel bleeds off every edge rather than
    // floating as a disc with visible sides.
    const reach = Math.hypot(p.width, p.height) / 2;
    const count = Math.round(lerp(24, 120, p.density));
    const spokes: Spoke[] = [];
    for (let i = 0; i < count; i++) {
      const hot = chance(rng, 0.08 + p.density * 0.1);
      // Quantised to the spoke index rather than drawn freely: evenly spaced
      // radials are the whole character of the form, and jitter reads as a
      // mistake rather than as texture.
      const angle = (i / count) * TAU;
      spokes.push({
        angle,
        inner: reach * range(rng, 0.08, 0.34),
        outer: reach * range(rng, 0.55, 1),
        hot,
      });
    }
    const ringCount = Math.round(lerp(3, 9, p.density));
    const rings = Array.from({ length: ringCount }, (_, i) => ({
      r: reach * ((i + 1) / (ringCount + 1)),
      hot: chance(rng, 0.25),
    }));
    return { spokes, rings, cx, cy, reach };
  },
  project: (w, p, t) => {
    const faint = withAlpha(p.accent, 0.3);
    const bright = withAlpha(p.accent, 0.95);
    const ringColor = withAlpha(p.accent, 0.4);
    // A shear, not a spin.
    //
    // This turned the whole wheel once per loop, and it was much the fastest
    // thing in the set — peak displacement 1581px against 155px for the next
    // busiest generator. Rigid rotation cannot be otherwise: tangential speed
    // is `ω · r`, so the rim always outruns the hub, and the outer ends were
    // covering the full circumference while the middle barely moved.
    //
    // So each spoke sweeps through an angle *inversely* proportional to how far
    // out it reaches, which is what makes every tip travel roughly the same arc
    // — a constant-speed field rather than a rigid body. The inner spokes turn
    // further than the outer ones, which shears the wheel and reads as the
    // spiral the rigid version was only hinting at.
    const arc = SPOKE_ARC * w.reach;
    let out = '';
    for (const s of w.spokes) {
      const a = s.angle + (arc / s.outer) * wobble(t, 1, 0);
      // A travelling pulse around the wheel, on its own whole-cycle phase so it
      // no longer depends on the sweep — which is now far too small to drive it.
      const pulse = 1 + 0.16 * Math.sin(s.angle * 3 + t * TAU * 2);
      const x1 = w.cx + Math.cos(a) * s.inner;
      const y1 = w.cy + Math.sin(a) * s.inner;
      const x2 = w.cx + Math.cos(a) * s.outer * pulse;
      const y2 = w.cy + Math.sin(a) * s.outer * pulse;
      out += `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${s.hot ? bright : faint}" stroke-width="${r2(p.strokeWidth * (s.hot ? 2.2 : 1))}"/>`;
    }
    for (const ring of w.rings) {
      const r = ring.r * (1 + 0.06 * Math.sin(t * TAU * 2 + ring.r * 0.02));
      out += `<circle cx="${r2(w.cx)}" cy="${r2(w.cy)}" r="${r2(r)}" fill="none" stroke="${ring.hot ? bright : ringColor}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
};

/* ── interference ─────────────────────────────────────────────────────────── */

interface Source {
  x: number;
  y: number;
  freq: number;
  amp: number;
  orbit: number;
  orbitPhase: number;
  orbitCycles: number;
}

interface Field {
  sources: Source[];
  rows: number[];
  cols: number[];
}

/**
 * Two-source wave interference, drawn as displaced horizontal rules.
 *
 * The best fit in the set for the sample/project split, because the split is
 * doing real work rather than being satisfied: the *grid* is sampled once and
 * never moves, and the *sources* move, so every mark on screen is the same mark
 * from frame to frame while the whole surface reorganises. Interference figures
 * are also worth having because they are the one pattern here that is not
 * decomposable — the fringes exist only in the sum, so no amount of per-mark
 * wobble produces them.
 *
 * Each source orbits a whole number of times per loop, so the field is
 * identical at `t = 1` and `t = 0` without any term needing to be written as
 * `f(t) − f(0)`.
 */
const interference: SampledGenerator<Field> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Two or three. More sources do not read as more interference, they read as
    // noise — the fringes stop being traceable once there are enough of them.
    const count = intRange(rng, 2, 3);
    const sources: Source[] = [];
    for (let i = 0; i < count; i++) {
      sources.push({
        x: range(rng, p.width * 0.15, p.width * 0.85),
        y: range(rng, p.height * 0.15, p.height * 0.85),
        freq: range(rng, 0.012, 0.028),
        amp: range(rng, 10, 22),
        orbit: range(rng, 40, 130),
        orbitPhase: range(rng, 0, TAU),
        orbitCycles: intRange(rng, 1, 2),
      });
    }
    const gap = lerp(34, 12, p.density);
    const rows: number[] = [];
    for (let y = gap / 2; y < p.height; y += gap) rows.push(y);
    // Sample points along x. Fixed count, so the emitted number count cannot
    // change with t — the mark-count invariant is structural here, not lucky.
    const step = Math.max(6, Math.round(lerp(16, 7, p.density)));
    const cols: number[] = [];
    for (let x = 0; x <= p.width; x += step) cols.push(x);
    return { sources, rows, cols };
  },
  project: (f, p, t) => {
    const faint = withAlpha(p.accent, 0.34);
    const bright = withAlpha(p.accent, 0.9);
    // Sources first: every row reads the same moved sources, which is what makes
    // the fringes coherent rather than each row inventing its own.
    const at = f.sources.map((s) => {
      const a = s.orbitPhase + t * TAU * s.orbitCycles;
      return {
        x: s.x + Math.cos(a) * s.orbit,
        y: s.y + Math.sin(a) * s.orbit,
        freq: s.freq,
        amp: s.amp,
      };
    });
    let out = '';
    for (let i = 0; i < f.rows.length; i++) {
      const y0 = f.rows[i];
      let d = '';
      for (const x of f.cols) {
        let dy = 0;
        for (const s of at) {
          const dist = Math.hypot(x - s.x, y0 - s.y);
          // Amplitude falls off with distance, so a source reads as a source
          // rather than as a global modulation of the whole frame.
          dy += s.amp * Math.sin(dist * s.freq) * (1 / (1 + dist * 0.004));
        }
        d += `${d ? 'L' : 'M'}${r2(x)} ${r2(y0 + dy)}`;
      }
      const hot = i % 7 === 3;
      out += `<path d="${d}" fill="none" stroke="${hot ? bright : faint}" stroke-width="${r2(p.strokeWidth * (hot ? 1.8 : 0.9))}"/>`;
    }
    return frame(p, out);
  },
};

/* ── flow-field ───────────────────────────────────────────────────────────── */

interface Quill {
  x: number;
  y: number;
  len: number;
  hot: boolean;
  /** Sampled bias, so the field is not the only thing setting the angle. */
  skew: number;
}

interface Flow {
  quills: Quill[];
  /** Field constants — the field's shape, sampled once. */
  a: number;
  b: number;
  c: number;
}

/** Radians the field sways through per loop. */
const FLOW_SWAY = 0.9;

/**
 * A vector field, drawn as the direction field itself.
 *
 * ## Why this is not streamlines
 *
 * The obvious adaptation of `flow_lines` is to integrate: seed a point, step it
 * through the field twenty-odd times, draw the path. That version was built
 * first and it fails this directory's smoothness invariant outright — it scored
 * a peak/worst ratio of **1.0**, which is the confetti signature, from a
 * generator that re-rolls nothing at all.
 *
 * Advection is why. Each integration step feeds its position into the next, so
 * an angular nudge at the seed is compounded all the way down the line, and near
 * a separatrix the tail does not drift — it switches channel. Measured: one
 * value moving 271px in a single 1/300 step, and a trace that jumps 739 → 468
 * and then carries on smoothly. The motion is continuous in the mathematical
 * sense and discontinuous at any rate you can actually sample it at.
 *
 * Weakening the field does not fix it, it only postpones it: a sweep across
 * amplitudes 0.4–1.1 and step counts 4–26 never cleared a ratio of 5.5, against
 * 45+ for every other generator here. Coherence and advection are in genuine
 * tension, and the invariant is the more valuable of the two.
 *
 * So this draws the field rather than its integral: a quill at each sample
 * point, angled by the field, with no feedback between them. Every mark depends
 * on `t` through exactly one smooth term, which is why it moves like everything
 * else in this file. It is also the form `wave-field` takes in the reference
 * set — the same idea, in the version that survives being tested.
 */
const flowField: SampledGenerator<Flow> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const gap = lerp(64, 26, p.density);
    const quills: Quill[] = [];
    // Half a cell of bleed, so the field does not stop short of the frame.
    for (let y = -gap / 2; y < p.height + gap; y += gap) {
      for (let x = -gap / 2; x < p.width + gap; x += gap) {
        quills.push({
          x,
          y,
          len: gap * range(rng, 0.55, 0.95),
          hot: chance(rng, 0.07 + p.density * 0.08),
          skew: range(rng, -0.12, 0.12),
        });
      }
    }
    return {
      quills,
      a: range(rng, 1.2, 2.6),
      b: range(rng, 1.2, 2.6),
      // Whole cycles, via the same helper as everything else — the second field
      // term advances by `phase * c`, so a fractional `c` would leave it
      // mid-cycle at `t = 1` while the first term had closed.
      c: cycles(rng(), 2),
    };
  },
  project: (f, p, t) => {
    const faint = withAlpha(p.accent, 0.34);
    const bright = withAlpha(p.accent, 0.95);
    const phase = FLOW_SWAY * wobble(t, 1, 0);
    let out = '';
    for (const q of f.quills) {
      const u = q.x / p.width;
      const v = q.y / p.height;
      // Two crossed sines — `flow_lines`' "vector field written as two
      // formulas", and the whole of the field. The quill is centred on its
      // sample point and turned, so it pivots rather than swinging from one end.
      const angle =
        Math.sin(u * f.a * TAU + phase) * 1.15 +
        Math.cos(v * f.b * TAU - phase * f.c) * 1.15 +
        q.skew;
      const dx = (Math.cos(angle) * q.len) / 2;
      const dy = (Math.sin(angle) * q.len) / 2;
      out += `<line x1="${r2(q.x - dx)}" y1="${r2(q.y - dy)}" x2="${r2(q.x + dx)}" y2="${r2(q.y + dy)}" stroke="${q.hot ? bright : faint}" stroke-width="${r2(p.strokeWidth * (q.hot ? 1.8 : 0.85))}" stroke-linecap="round"/>`;
    }
    return frame(p, out);
  },
};

/* ── truchet-arcs ─────────────────────────────────────────────────────────── */

interface Tile {
  x: number;
  y: number;
  /** 0 or 1 — which diagonal the pair of quarter-arcs connects. */
  flip: number;
  hot: boolean;
  show: boolean;
  roll: number;
}

/**
 * Quarter-arc Truchet tiling.
 *
 * A Truchet tile has no orientation of its own; the pattern is entirely in how
 * neighbours agree. That makes it the one tiling whose *motion* can be about
 * connection rather than displacement — as tiles turn, arcs meet across edges
 * and long curves form and break across the whole frame. Nothing else here does
 * that, because everything else moves marks that were already unrelated.
 *
 * The tiles rock rather than spin, for the reason `scatter-blocks` sets out: a
 * printed `rotate()` of `360` is textually different from `0` while being the
 * same picture. A ±90° rock sweeps through every connection state anyway, which
 * is the part worth seeing.
 */
const truchetArcs: SampledGenerator<Tile[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const size = lerp(120, 46, p.density);
    const tiles: Tile[] = [];
    for (let y = 0; y < p.height + size; y += size) {
      for (let x = 0; x < p.width + size; x += size) {
        const flip = intRange(rng, 0, 1);
        const hot = chance(rng, 0.07 + p.density * 0.08);
        // `quarter_circles_grid` leaves tiles out at random, which is what stops
        // a Truchet reading as wallpaper — the breaks are what make the surviving
        // curves legible as paths.
        const show = chance(rng, 0.82);
        // Truchet is the tiling that suffers most from this and gains most:
        // arcs only connect while the tiles line up, so the ramp reads as the
        // pattern's continuity failing rather than as marks moving.
        const chaos = disorderAt(p, y);
        tiles.push({
          x: x + chaos * size * 0.45 * scramble(x, y, 5),
          y: y + chaos * size * 0.45 * scramble(x, y, 6),
          flip,
          hot,
          show,
          roll: rng(),
        });
      }
    }
    return tiles;
  },
  project: (tiles, p, t) => {
    const size = lerp(120, 46, p.density);
    const faint = withAlpha(p.accent, 0.38);
    const bright = withAlpha(p.accent, 0.95);
    const h = size / 2;
    let out = '';
    for (const tile of tiles) {
      // Hidden tiles still emit, at zero opacity, so the mark count is constant
      // across the loop and across densities. Dropping them instead would make
      // the emitted-number count depend on the sample, which is exactly what the
      // confetti test watches for.
      const stroke = !tile.show ? 'none' : tile.hot ? bright : faint;
      const k = cycles(tile.roll, 2);
      const phase = (tile.x + tile.y) * 0.008 + tile.roll * TAU;
      const rot = r2(tile.flip * 90 + 90 * wobble(t, k, phase));
      const cx = tile.x + h;
      const cy = tile.y + h;
      // Two quarter-arcs on opposite corners — the Truchet unit.
      const d =
        `M${r2(tile.x)} ${r2(cy)} A${r2(h)} ${r2(h)} 0 0 1 ${r2(cx)} ${r2(tile.y)} ` +
        `M${r2(cx)} ${r2(tile.y + size)} A${r2(h)} ${r2(h)} 0 0 1 ${r2(tile.x + size)} ${r2(cy)}`;
      out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (tile.hot ? 2.4 : 1.2))}" transform="rotate(${rot} ${r2(cx)} ${r2(cy)})" stroke-linecap="butt"/>`;
    }
    return frame(p, out);
  },
};

/* ── iso-cubes ────────────────────────────────────────────────────────────── */

interface Cube {
  col: number;
  row: number;
  /** Sampled height in cube units — the still silhouette. */
  height: number;
  lit: boolean;
  phase: number;
}

/**
 * Isometric cubes on a height field — the generator `occlusion` exists for.
 *
 * `iso-grid` draws diamonds because flat diamonds never overlap. The moment
 * cubes stack, a nearer cube has to hide the one behind it, and there is no way
 * to say that with an accent and an alpha: `withAlpha(accent, 0.9)` still lets
 * the far cube through, and the stack turns to soup exactly where the depth cue
 * was supposed to be. So the faces are painted `p.occlusion` — opaque, matching
 * the surface — and the form is carried by the stroked edges over the top.
 *
 * That is the technique the isometric patterns in the reference set use, and
 * measurably so: they are the only ten of the fifty-seven that declare an
 * occlusion colour at all.
 *
 * Draw order is back-to-front by `row + col`, which is the whole of painter's
 * algorithm on a regular lattice and the reason the occlusion reads correctly.
 */
const isoCubes: SampledGenerator<Cube[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cols = Math.round(lerp(7, 16, p.density));
    const rows = Math.round(lerp(9, 20, p.density));
    const cubes: Cube[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        cubes.push({
          col,
          row,
          height: range(rng, 0.15, 1),
          lit: chance(rng, 0.14),
          phase: range(rng, 0, TAU),
        });
      }
    }
    // Painter's order. Sorted after sampling so the rng stream stays in lattice
    // order and does not depend on the comparator.
    return cubes.sort((a, b) => a.row + a.col - (b.row + b.col));
  },
  project: (cubes, p, t) => {
    const cw = lerp(74, 38, p.density);
    const halfW = cw / 2;
    const halfH = cw * 0.29;
    const unit = cw * 0.62;
    const edge = withAlpha(p.accent, 0.55);
    const litTop = withAlpha(p.accent, 0.9);
    const dimTop = withAlpha(p.accent, 0.16);
    const originX = p.width / 2;
    const originY = p.height * 0.16;
    let out = '';
    for (const c of cubes) {
      // A travelling wave over the lattice rather than a per-cube bob: the
      // surface rises and falls as a landscape, which is the thing a height
      // field can do that a grid of independent pulses cannot.
      const lift =
        1 +
        0.45 * wobble(t, cycles(c.height, 2), c.phase + (c.col - c.row) * 0.5);
      const hgt = c.height * unit * lift;
      const bx = originX + (c.col - c.row) * halfW;
      const by = originY + (c.col + c.row) * halfH;
      const top = by - hgt;
      // Left and right faces, opaque, so this cube hides whatever is behind it.
      const left = `${r2(bx - halfW)},${r2(by - halfH)} ${r2(bx)},${r2(by)} ${r2(bx)},${r2(top)} ${r2(bx - halfW)},${r2(top - halfH)}`;
      const right = `${r2(bx + halfW)},${r2(by - halfH)} ${r2(bx)},${r2(by)} ${r2(bx)},${r2(top)} ${r2(bx + halfW)},${r2(top - halfH)}`;
      const cap = `${r2(bx)},${r2(top)} ${r2(bx + halfW)},${r2(top - halfH)} ${r2(bx)},${r2(top - halfH * 2)} ${r2(bx - halfW)},${r2(top - halfH)}`;
      out += `<polygon points="${left}" fill="${p.occlusion}"/>`;
      out += `<polygon points="${right}" fill="${p.occlusion}"/>`;
      out += `<polygon points="${cap}" fill="${c.lit ? litTop : dimTop}"/>`;
      out += `<path d="M${r2(bx - halfW)} ${r2(top - halfH)} L${r2(bx)} ${r2(top)} L${r2(bx + halfW)} ${r2(top - halfH)} M${r2(bx)} ${r2(top)} L${r2(bx)} ${r2(by)}" fill="none" stroke="${edge}" stroke-width="${p.strokeWidth}"/>`;
      out += `<polygon points="${cap}" fill="none" stroke="${edge}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
};

/* ── flow-lines ───────────────────────────────────────────────────────────── */

interface Streamline {
  /** Points integrated once, in `sample`, where there is no `t` to destabilise. */
  points: [number, number][];
  hot: boolean;
  phase: number;
  drift: number;
}

/** Integration steps per streamline. */
const LINE_STEPS = 30;

/** Segments a streamline is cut into, for the travelling highlight. */
const LINE_SEGMENTS = 10;

/**
 * Long streamlines through a vector field — the striking half of `flow_lines`,
 * with the instability designed out rather than tuned down.
 *
 * `flow-field` draws the direction field because *advecting* it per frame is
 * chaotic: each integration step feeds the next, so near a separatrix a tail
 * switches channel instead of drifting, and the smoothness ratio collapses to
 * 1.0. That finding stands, and it is why this generator does not move the
 * field either.
 *
 * What it does instead is put the integration in `sample`, which is the half of
 * the split with no `t` in it at all. The curves are traced once and then never
 * re-integrated. `project` moves each point by a bounded term computed from its
 * *own sampled position* — no point's displacement is a function of the
 * previous point's displacement, so there is no feedback to compound and the
 * motion is exactly as smooth as `dot-grid`'s.
 *
 * The flow itself is carried by brightness rather than by geometry: each curve
 * is cut into segments lit by a wave travelling along its length, so the line
 * reads as something moving *through* it while the curve barely stirs. That is
 * the part advection was wanted for, and it turns out not to need advection.
 */
const flowLines: SampledGenerator<Streamline[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const count = Math.round(lerp(18, 70, p.density));
    const a = range(rng, 1.1, 2.2);
    const b = range(rng, 1.1, 2.2);
    const step = Math.min(p.width, p.height) * 0.032;
    const lines: Streamline[] = [];
    for (let i = 0; i < count; i++) {
      let x = range(rng, -0.1, 1.1) * p.width;
      let y = range(rng, -0.1, 1.1) * p.height;
      const points: [number, number][] = [[x, y]];
      for (let k = 0; k < LINE_STEPS; k++) {
        // Integration lives here and only here. Chaotic sensitivity is
        // harmless in `sample`, because `sample` is called once.
        const ang =
          Math.sin((x / p.width) * a * TAU) * 1.35 +
          Math.cos((y / p.height) * b * TAU) * 1.35;
        x += Math.cos(ang) * step;
        y += Math.sin(ang) * step;
        points.push([x, y]);
      }
      lines.push({
        points,
        hot: chance(rng, 0.14),
        phase: range(rng, 0, TAU),
        drift: range(rng, 0.5, 1),
      });
    }
    return lines;
  },
  project: (lines, p, t) => {
    const sway = Math.min(p.width, p.height) * 0.035;
    let out = '';
    for (const line of lines) {
      const k = cycles(line.drift, 2);
      // One displacement per point, each from that point's own sampled
      // coordinates. Neighbours move nearly together because the term varies
      // smoothly in space, so the curve bends rather than shattering.
      const moved = line.points.map(([px, py]) => {
        const ph = line.phase + (px + py) * 0.004;
        return [
          px + sway * line.drift * wobble(t, k, ph),
          py + sway * line.drift * wobble(t, k, ph + Math.PI / 2),
        ] as [number, number];
      });
      const per = Math.max(1, Math.floor((moved.length - 1) / LINE_SEGMENTS));
      for (let sIdx = 0; sIdx * per < moved.length - 1; sIdx++) {
        const from = sIdx * per;
        const to = Math.min(moved.length - 1, from + per);
        let d = '';
        for (let i = from; i <= to; i++) {
          d += `${i === from ? 'M' : 'L'}${r2(moved[i][0])} ${r2(moved[i][1])}`;
        }
        // The travelling highlight. Whole cycles per loop, so it closes; the
        // segment index sets where it is along the curve, so the pulse runs
        // from head to tail rather than the whole line blinking.
        const lit = (Math.sin(sIdx * 0.9 - t * TAU * 2 + line.phase) + 1) / 2;
        const alpha = (line.hot ? 0.35 : 0.14) + lit * (line.hot ? 0.6 : 0.3);
        out += `<path d="${d}" fill="none" stroke="${withAlpha(p.accent, r2(alpha))}" stroke-width="${r2(p.strokeWidth * (line.hot ? 1.7 : 0.9))}" stroke-linecap="round"/>`;
      }
    }
    return frame(p, out);
  },
};

/* ── broken-ring ──────────────────────────────────────────────────────────── */

interface RingBand {
  /** Inner and outer radius as fractions of reach. */
  r0: number;
  r1: number;
  /** Cells around the band. */
  cells: { fill: boolean; hot: boolean }[];
  /** Whole cycles per loop, signed — adjacent bands counter-rotate. */
  spin: number;
  phase: number;
}

/**
 * Concentric polygon bands, cut into cells, most of them missing.
 *
 * The reference's *Broken Ring*. Its whole character is the negative space —
 * a complete annulus is a target, and one with two thirds of its cells knocked
 * out is a structure. The bands are polygonal rather than circular, so the
 * facets catch the rotation; a true circle rotating is invisible.
 *
 * Bands counter-rotate at their own whole-cycle rates, which is the dynamism a
 * centred form can have that an edge-to-edge texture cannot: there is a fixed
 * middle for the eye to hold while everything around it shears past.
 */
const brokenRing: SampledGenerator<RingBand[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const bands = Math.round(lerp(4, 9, p.density));
    const perBand = Math.round(lerp(14, 30, p.density));
    const out: RingBand[] = [];
    for (let i = 0; i < bands; i++) {
      const r0 = 0.16 + (i / bands) * 0.78;
      const r1 = r0 + (0.78 / bands) * 0.78;
      const cells = Array.from({ length: perBand }, () => ({
        fill: chance(rng, 0.34),
        hot: chance(rng, 0.08),
      }));
      out.push({
        r0,
        r1,
        cells,
        // Signed, so neighbouring bands turn opposite ways and the gaps between
        // them shear rather than sliding as a block.
        //
        // One turn per loop, never two. `cycles(v, 2)` would sometimes return
        // 2, and at this reach that doubles the rim to roughly 470px/s — the
        // speed `radial-spokes` was called out for. One revolution per loop is
        // about 5rpm and reads as stately.
        spin: cycles(rng(), 1) * (i % 2 ? -1 : 1),
        phase: range(rng, 0, TAU),
      });
    }
    return out;
  },
  project: (bands, p, t) => {
    const cx = p.width / 2;
    const cy = p.height / 2;
    const reach = Math.min(p.width, p.height) * 0.62;
    const edge = withAlpha(p.accent, 0.34);
    let out = '';
    for (const band of bands) {
      const n = band.cells.length;
      const step = TAU / n;
      // Rotation consumed by cos/sin rather than printed as a `rotate()`:
      // `360` and `0` draw the same picture and are different strings, so a
      // printed whole turn would fail the loop-closure test that this passes.
      const spin = band.phase + t * TAU * band.spin;
      const inner = band.r0 * reach;
      const outer = band.r1 * reach;
      for (let i = 0; i < n; i++) {
        const cell = band.cells[i];
        const a0 = spin + i * step;
        const a1 = a0 + step * 0.86;
        const pt = (a: number, r: number) =>
          `${r2(cx + Math.cos(a) * r)},${r2(cy + Math.sin(a) * r)}`;
        // Every cell is emitted whether or not it is filled — an omitted cell
        // would change the emitted-number count with the sample, which is what
        // the confetti test watches for.
        const fill = cell.hot
          ? withAlpha(p.accent, 0.9)
          : cell.fill
            ? withAlpha(p.accent, 0.22)
            : 'none';
        out += `<polygon points="${pt(a0, inner)} ${pt(a1, inner)} ${pt(a1, outer)} ${pt(a0, outer)}" fill="${fill}" stroke="${cell.fill || cell.hot ? edge : 'none'}" stroke-width="${p.strokeWidth}"/>`;
      }
    }
    return frame(p, out);
  },
};

/* ── modular-circle ───────────────────────────────────────────────────────── */

interface Orbit {
  /** Base radius as a fraction of reach. */
  r: number;
  points: { angle: number; rad: number; hot: boolean }[];
  /** Angle the ring's points gather toward. */
  focus: number;
  /** Whole cycles per loop for the gather/scatter. */
  beat: number;
  /** Offset so the rings do not all gather on the same beat. */
  phase: number;
  spin: number;
}

/** How far into the ring's own width a point may wander, as a fraction. */
const ORBIT_BAND = 0.2;

/**
 * Concentric rings of points that gather and scatter.
 *
 * The motion is angular, not radial: each ring's points ease toward a focus
 * angle and spread back out again, so the ring visibly bunches on one side and
 * thins on the other while staying a ring. Radial movement is deliberately
 * confined to the outer fifth of each ring's width (`ORBIT_BAND`) — enough to
 * stop the points looking pinned to a wire, little enough that the concentric
 * structure never blurs into a disc.
 *
 * Gathering is a lerp toward the focus rather than an added offset, because an
 * offset moves every point by the same amount and reads as rotation. Pulling
 * each point a *fraction of its own distance* to the focus is what makes them
 * converge — near points barely move, far ones travel a long way, and the ring
 * closes up like a drawstring.
 */
const modularCircle: SampledGenerator<Orbit[]> = {
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const rings = Math.round(lerp(4, 10, p.density));
    const out: Orbit[] = [];
    for (let i = 0; i < rings; i++) {
      const count = Math.round(lerp(10, 30, p.density)) + intRange(rng, 0, 6);
      out.push({
        r: 0.2 + (i / Math.max(1, rings - 1)) * 0.76,
        points: Array.from({ length: count }, (_, j) => ({
          angle: (j / count) * TAU,
          rad: range(rng, 2.6, 5.6),
          hot: chance(rng, 0.12),
        })),
        focus: range(rng, 0, TAU),
        beat: cycles(rng(), 3),
        phase: range(rng, 0, TAU),
        // One turn per loop, for the same reason as `broken-ring`. The
        // gather/scatter `beat` may run faster because it travels a short
        // angular distance, not the whole circumference.
        spin: cycles(rng(), 1) * (i % 2 ? -1 : 1),
      });
    }
    return out;
  },
  project: (rings, p, t) => {
    const cx = p.width / 2;
    const cy = p.height / 2;
    const reach = Math.min(p.width, p.height) * 0.46;
    const bandWidth = reach / Math.max(1, rings.length);
    let out = '';
    for (const ring of rings) {
      const base = ring.r * reach;
      // A faint guide per ring. Without it the concentric structure never
      // reads: the points alone are just a scatter that happens to be round,
      // and the whole idea is that they are gathering *on* something.
      out += `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(base)}" fill="none" stroke="${withAlpha(p.accent, 0.12)}" stroke-width="${r2(p.strokeWidth * 0.6)}"/>`;
      // 0 at rest, 1 fully gathered. `wobble` keeps it zero at both ends of the
      // loop, so the ring starts and finishes evenly spaced.
      const gather = 0.42 * wobble(t, ring.beat, ring.phase);
      // No fractional multiplier here. A `* 0.5` looked like a reasonable way
      // to halve the speed and left an odd `spin` mid-turn at `t = 1`, which
      // the loop-closure test caught immediately. Slower means a smaller
      // `cycles()` ceiling, never a fraction of one.
      const spin = t * TAU * ring.spin;
      for (const pt of ring.points) {
        // Shortest way round to the focus, so a point never takes the long
        // route and swings through the far side of the ring to get there.
        let delta = ring.focus - pt.angle;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        const a = pt.angle + delta * gather + spin;
        // Radial wander, confined to the outer band — and zero at rest.
        //
        // This was a plain `sin(angle * 3 + …)`, which is non-zero at `t = 0`
        // and so pushed every point off its ring before anything had moved.
        // The rings stopped looking like rings and the whole form read as a
        // scatter. `wobble` starts it at zero, so the still frame is clean
        // concentric rings and the wander is something that *happens* to them.
        const r =
          base +
          bandWidth *
            ORBIT_BAND *
            wobble(t, ring.beat, pt.angle * 3 + ring.phase);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(pt.rad)}" fill="${withAlpha(p.accent, pt.hot ? 0.98 : 0.68)}"/>`;
      }
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
  'hex-grid': hexGrid,
  'triangle-grid': triangleGrid,
  ridgeline: ridgeline,
  'radial-spokes': radialSpokes,
  interference: interference,
  'flow-field': flowField,
  'truchet-arcs': truchetArcs,
  'iso-cubes': isoCubes,
  'flow-lines': flowLines,
  'broken-ring': brokenRing,
  'modular-circle': modularCircle,
};

export type GeneratorName = keyof typeof SAMPLED_GENERATORS;

export type { Rng };
