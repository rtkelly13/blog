import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  cycles,
  frame,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  withAlpha,
} from './shared';

/* ── phyllotaxis ──────────────────────────────────────────────────────────── */

/**
 * The golden angle, in radians. 137.507° — the placement rule, not a look.
 *
 * Written out rather than derived from φ because the number is the whole
 * subject: nudge it by a tenth of a degree and the spiral arms unwind into
 * radial spokes, which is the fastest way to see that the packing is doing
 * something no other angle does.
 */
const GOLDEN_ANGLE = (137.507 * Math.PI) / 180;

/**
 * Candidate parastichy orders — the Fibonacci numbers.
 *
 * A seed head's visible arms are not drawn; they are the *nearest-neighbour*
 * chains, and a chain steps by a Fibonacci number of placements. Which one is
 * nearest changes with radius, which is why a sunflower shows 21 arms near the
 * middle and 34 further out. Picking the minimising `k` per mark reproduces
 * that transition for free.
 */
const PARASTICHIES = [5, 8, 13, 21, 34];

/** One mark: where it sits, and which way its neighbour lies. */
interface Seed {
  r: number;
  ang: number;
  /** Direction to the nearest Fibonacci neighbour, before rotation. */
  dir: number;
  /** Distance to it — the local packing pitch, so dashes nearly touch. */
  pitch: number;
  /** Fraction of the way out, 0 at the centre and 1 at the rim. */
  u: number;
}

/**
 * A brightness band, and the marks that belong to it.
 *
 * Banding is a file-size decision with a coherence constraint attached. One
 * `<line>` per mark costs about 85 bytes against 30 for a move-and-line inside
 * a shared `<path>`, and at this mark count that is the difference between
 * 190KB of data URI and 60KB. The catch is that a path can carry only one
 * stroke, so brightness has to be a property of the *band* rather than of the
 * mark.
 *
 * Which forces the band to be sampled, not animated. The coherence suite
 * compares emitted numbers by position, so a mark that changed band mid-loop
 * would move its four coordinates to a different index in the document and
 * register as a teleport — the smoothness ratio collapses even though nothing
 * on screen moved. Bands are fixed at sample time; only their alpha breathes.
 */
interface Band {
  alpha: number;
  width: number;
  phase: number;
  /** Whole cycles per loop of this band's shimmer. */
  beat: number;
  seeds: Seed[];
}

interface Head {
  cx: number;
  cy: number;
  bands: Band[];
  /** Whole cycles per loop of the wave travelling out through the arms. */
  waveCycles: number;
}

const BAND_COUNT = 5;

/** Whole turns per loop. One is roughly 5rpm at a ten-second loop — stately. */
const HEAD_SPIN = 1;

/**
 * Golden-angle packing — the way a seed head fills a disc.
 *
 * Mark `i` sits at `i · 137.507°` and `√i` radii out, and that pair of rules is
 * the entire generator: no other one here places marks by *growing* them. The
 * square root is what keeps the density even — area grows as `r²`, so radius
 * has to grow as `√i` for each new mark to claim the same area as the last —
 * and the golden angle is what stops successive marks lining up, because it is
 * the irrational least well approximated by any fraction. The spiral arms
 * nobody drew are the consequence.
 *
 * Getting those arms to *read* took two corrections, and both were visible only
 * once rendered. Radial dashes were the first version and they actively fight
 * the spiral: a parastichy runs across the radius, not along it, so every mark
 * was pointing away from the chain the eye was trying to join. Each dash now
 * lies along the direction of its nearest Fibonacci neighbour and is about as
 * long as the gap to it, so consecutive marks in a chain nearly touch and the
 * arm is a dashed line rather than a hint. Second, the marks have to be small
 * and numerous: an even packing read at a glance needs the marks closer
 * together than they are big, so the count went up by roughly three times and
 * the mark size down with it.
 *
 * Motion is a whole revolution per loop, consumed by `cos`/`sin` rather than
 * printed as a `rotate()`, since a printed `360` differs textually from `0` and
 * would break loop closure. Over it runs a wave travelling outward through the
 * arms, which lengthens each dash as it passes. Deliberately shallow: driving
 * brightness with it swept a dark band across the frame that read as a
 * rendering fault rather than as motion. A wave through a packing this even
 * should modulate it, not erase parts of it.
 */

export default defineGenerator<Head>({
  name: 'phyllotaxis',
  label: 'Phyllotaxis',
  description: 'Marks placed on the golden angle, the way a seed head packs.',
  group: 'radial',
  // Slower than the lattice generators, and the reason is geometric: a turn
  // at full reach covers the whole circumference, so what reads as a stately
  // rotation on a small form is a blur on a frame-filling one. See
  // `GeneratorModule.speed`.
  speed: 0.5,
  defaults: { density: 0.5, strokeWidth: 1.5 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cx = p.width / 2;
    const cy = p.height / 2;
    // The frame's own circumradius, so the head reaches the corners. Anything
    // less and the rim of the disc is inside the frame, which turns a texture
    // that fills the page into an object sitting on it.
    const reach = Math.hypot(p.width, p.height) / 2;
    const count = Math.round(lerp(1600, 3000, p.density));
    // The head's own orientation. The only thing the seed may move: the
    // placement rule is the subject, so jittering the positions would be
    // vandalising the one property worth drawing.
    const phase = range(rng, 0, TAU);
    // `√(count − 1)` normalises the last mark onto the rim, so density changes
    // the number of marks rather than the size of the head.
    const scale = reach / Math.sqrt(Math.max(1, count - 1));

    // Placements are needed one parastichy beyond the last drawn mark, so the
    // outermost marks have a neighbour to point at.
    const look = PARASTICHIES[PARASTICHIES.length - 1];
    const px: number[] = [];
    const py: number[] = [];
    for (let i = 0; i < count + look; i++) {
      const r = scale * Math.sqrt(i);
      const a = i * GOLDEN_ANGLE + phase;
      px.push(Math.cos(a) * r);
      py.push(Math.sin(a) * r);
    }

    const bands: Band[] = Array.from({ length: BAND_COUNT }, (_, b) => ({
      alpha: lerp(0.3, 0.92, b / (BAND_COUNT - 1)),
      width: p.strokeWidth * lerp(0.55, 1, b / (BAND_COUNT - 1)),
      phase: range(rng, 0, TAU),
      beat: cycles(rng(), 3),
      seeds: [],
    }));

    for (let i = 0; i < count; i++) {
      let k = PARASTICHIES[0];
      let best = Infinity;
      for (const cand of PARASTICHIES) {
        const d = Math.hypot(px[i + cand] - px[i], py[i + cand] - py[i]);
        if (d < best) {
          best = d;
          k = cand;
        }
      }
      const r = scale * Math.sqrt(i);
      // Skewed towards the dim bands: an even scatter of bright marks is a
      // texture, whereas a faint field with a few bright ones has depth.
      const roll = rng() ** 1.9;
      bands[Math.min(BAND_COUNT - 1, Math.floor(roll * BAND_COUNT))].seeds.push(
        {
          r,
          ang: i * GOLDEN_ANGLE + phase,
          dir: Math.atan2(py[i + k] - py[i], px[i + k] - px[i]),
          pitch: best,
          u: r / reach,
        },
      );
    }

    return { cx, cy, bands, waveCycles: cycles(rng(), 3) };
  },

  project: (h, p, t) => {
    const rot = t * TAU * HEAD_SPIN;
    let out = '';
    for (const band of h.bands) {
      let d = '';
      for (const s of band.seeds) {
        const a = s.ang + rot;
        // Two crests between centre and rim, travelling outward.
        const wave = Math.sin(s.u * TAU * 2 - t * TAU * h.waveCycles);
        // A little under the local pitch, so a chain of marks reads as a dashed
        // line with gaps rather than as a solid one.
        const half = s.pitch * (0.38 + 0.09 * wave);
        const cx = h.cx + Math.cos(a) * s.r;
        const cy = h.cy + Math.sin(a) * s.r;
        const dx = Math.cos(s.dir + rot) * half;
        const dy = Math.sin(s.dir + rot) * half;
        d += `M${r2(cx - dx)} ${r2(cy - dy)}L${r2(cx + dx)} ${r2(cy + dy)}`;
      }
      // Bands shimmer on their own whole-cycle beats. Because membership is
      // sampled, the bright marks are interleaved through the packing rather
      // than being a region of it, so this scintillates instead of sweeping.
      const alpha =
        band.alpha * (0.82 + 0.18 * Math.sin(band.phase + t * TAU * band.beat));
      out += `<path d="${d}" fill="none" stroke="${withAlpha(p.accent, r2(alpha))}" stroke-width="${r2(band.width)}" stroke-linecap="round"/>`;
    }
    return frame(p, out);
  },
});
