import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  intRange,
  lerp,
  mulberry32,
  pick,
  r2,
  range,
  TAU,
  withAlpha,
} from './shared';

/* ── rose-curve ───────────────────────────────────────────────────────────── */

interface Rose {
  /** Petal frequency. Integer, so the curve closes over one turn of θ. */
  k: number;
  /** Radius as a fraction of the reach. */
  scale: number;
  /** Whole turns per loop, signed. */
  turn: number;
  /** Whole cycles of the amplitude wave per loop. */
  wave: number;
  /** How many amplitude crests fit round the rose. Integer, for the same reason `k` is. */
  lobes: number;
  phase: number;
  hot: boolean;
}

/**
 * Points per rose. See the note in `lissajous.ts` — one constant for every
 * curve, because the count of emitted numbers has to be identical at every `t`
 * and the surest way to guarantee that is for it never to depend on anything.
 *
 * 288 is set by the busiest case: `k = 7` even would be 14 petals, so this is
 * about 20 points per petal, which keeps the tips pointed rather than chamfered.
 */
const SAMPLES = 288;

/**
 * How far the travelling wave pushes a petal in and out, as a fraction of its
 * radius. Large enough to see the wave pass; small enough that the nesting
 * order never inverts and the rings stop reading as nested.
 */
const PETAL_PULSE = 0.14;

/**
 * Petal counts, chosen so every curve closes.
 *
 * `r = cos(kθ)` with integer `k` is periodic in θ with period `2π`, so tracing
 * θ once round returns exactly to the start — the closure is in the geometry,
 * not imposed on it. The parity is what sets the look: odd `k` draws `k` petals,
 * because the negative half of the cosine retraces the petals the positive half
 * already drew; even `k` draws `2k`, because the negative lobes fall in the gaps
 * instead. A non-integer `k` closes only after many turns, or never, and reads
 * as a scribble rather than a flower — the same failure a fractional cycle count
 * produces in a loop.
 */
const PETALS: readonly number[] = [2, 3, 4, 5, 6, 7];

/**
 * Nested polar roses, turning and breathing.
 *
 * Concentric rather than scattered, and that is the composition: each rose is a
 * different `k` at a different radius about one centre, so the frame has a
 * middle that gets busier the further out you read — a flower rather than a
 * texture. `radial-spokes` makes the same argument for having a centre at all;
 * this one fills it with structure instead of pointing at it.
 *
 * Two motions, deliberately on separate whole-cycle rates. Each rose turns at
 * its own signed integer rate, so adjacent rings counter-rotate and the moiré
 * between their petals is never still. Over that, a travelling wave runs round
 * each rose pushing petals out and drawing them back — a spatial term in θ
 * minus a temporal one in `t`, which is what makes the crest *travel* rather
 * than the whole rose pulse as one. Both close at `t = 1` for the same reason
 * the curve itself closes: every count involved is an integer.
 */
export default defineGenerator<Rose[]>({
  name: 'rose-curve',
  label: 'Rose Curve',
  description: 'Petal curves from r = cos(k.theta), nested and turning.',
  group: 'radial',
  // Slower than the lattice generators, and the reason is geometric: a turn
  // at full reach covers the whole circumference, so what reads as a stately
  // rotation on a small form is a blur on a frame-filling one. See
  // `GeneratorModule.speed`.
  speed: 0.5,
  defaults: { density: 0.55, strokeWidth: 1.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const count = Math.round(lerp(3, 8, p.density));
    const roses: Rose[] = [];
    for (let i = 0; i < count; i++) {
      // Radius is quantised to the index, not drawn. Nesting is the whole form,
      // and a drawn radius sooner or later puts two roses on top of each other,
      // which reads as one rose drawn badly rather than as two.
      const scale = lerp(0.42, 1, (i + 1) / count);
      roses.push({
        k: pick(rng, PETALS),
        scale,
        // One turn per loop at most for the outermost rings, which is not a
        // stylistic cap: tangential speed is `ω · r`, so at this reach a second
        // turn moves the rim further per frame than the eye tracks as rotation.
        turn: cycles(rng(), i < count - 2 ? 2 : 1) * (i % 2 ? 1 : -1),
        wave: cycles(rng(), 3),
        lobes: intRange(rng, 2, 5),
        phase: range(rng, 0, TAU),
        hot: chance(rng, 0.28),
      });
    }
    return roses;
  },
  project: (roses, p, t) => {
    const cx = p.width / 2;
    const cy = p.height / 2;
    // Sized off the diagonal, not the short edge. Tangent to the top and bottom
    // is the tidier disc and the weaker composition: at 16:9 it leaves a third
    // of the width empty on either side, so the flower floats in the middle of
    // the frame with visible sides. Overrunning the short edge instead lets the
    // outermost petals leave the frame, which is what makes it read as a
    // background rather than as an illustration of a flower.
    const reach = (Math.hypot(p.width, p.height) / 2) * 0.62;
    const faint = withAlpha(p.accent, 0.3);
    const bright = withAlpha(p.accent, 0.95);
    let out = '';
    for (const rose of roses) {
      const radius = reach * rose.scale;
      const spin = t * TAU * rose.turn;
      let d = '';
      for (let i = 0; i < SAMPLES; i++) {
        const theta = (i / SAMPLES) * TAU;
        // `-t` rather than `+t`: with both terms positive the crest would run
        // against the rose's own rotation and the two motions cancel to a
        // near-stationary pattern at some radii. Opposed, they never do.
        const pulse =
          1 +
          PETAL_PULSE *
            Math.sin(rose.lobes * theta + rose.phase - t * TAU * rose.wave);
        // Signed radius, left signed on purpose. Clamping to `|cos|` would
        // reflect the negative lobes onto the positive ones and turn every even
        // `k` into its odd-looking half, which is exactly the distinction the
        // parity note above is about.
        const r = radius * Math.cos(rose.k * theta) * pulse;
        const a = theta + spin;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        d += `${i === 0 ? 'M' : 'L'}${r2(x)} ${r2(y)} `;
      }
      out += `<path d="${d.trim()}Z" fill="none" stroke="${rose.hot ? bright : faint}" stroke-width="${r2(p.strokeWidth * (rose.hot ? 1.5 : 0.9))}"/>`;
    }
    return frame(p, out);
  },
});
