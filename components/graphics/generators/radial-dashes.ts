import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  centre,
  chance,
  frame,
  ink,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  wobble,
} from './shared';

/* ── radial-dashes ────────────────────────────────────────────────────────── */

interface Dash {
  /** Where the dash sits around its ring. */
  angle: number;
  /** Mid-radius in viewBox units — the dash straddles it. */
  r: number;
  /** Half-length, so the dash runs `r ± half` along its own radial. */
  half: number;
  /** Ramp position: normalised radius, precomputed with the rest of the ring. */
  pos: number;
  /** The shear phase of the ring this dash belongs to. */
  phase: number;
  hot: boolean;
}

/**
 * A dense annulus of short radial ticks, with the middle left empty.
 *
 * ## What makes it not `radial-spokes`
 *
 * The sibling draws long lines from near the hub out past the rim, plus a set
 * of concentric circles: the marks *are* the radius, so the eye reads outward
 * along them and the centre is the busiest part of the frame. This one keeps
 * the polar armature and throws away everything else. Each mark is a tick a few
 * dozen pixels long, none of them reach the middle, and there is not a single
 * circle — the rings exist only as the arrangement of the ticks, never drawn.
 *
 * The result is a band of texture with a clean hole in it, which is a different
 * job from the sibling's: spokes point *at* a title, an annulus makes *room*
 * for one. That is also why the open middle is generous rather than token —
 * {@link DASH_INNER} of reach is empty, and at the default origin that is a
 * clear ellipse of untouched space in the centre of the frame.
 *
 * ## Why the ticks bunch outward
 *
 * Rings are placed at `lerp(inner, outer, u ** DASH_BIAS)` with the exponent
 * below 1, which crowds them toward the rim. Spacing them evenly would make the
 * band read as uniform hatching between two radii; crowding them makes the
 * density itself a gradient, so the annulus fades inward and the hole has a
 * soft edge rather than a cut one. The tick count per ring is derived from its
 * circumference, so the *angular* spacing stays constant too and no ring looks
 * sparser than its neighbours simply for being smaller.
 *
 * ## Motion
 *
 * Each ring shears on its own phase, by an angle inversely proportional to its
 * radius, so every tip covers the same arc length regardless of how far out it
 * sits — the constant-speed field `radial-spokes` documents, for the same
 * reason: rigid rotation makes the rim outrun the hub, and at this reach the
 * rim then blurs. A travelling radial ripple runs around the band on top of
 * that, on a whole number of cycles, so the annulus breathes rather than merely
 * turning. Both are consumed by `cos`/`sin`; nothing is printed as a
 * `rotate()`, which would emit `360` against `0` and break the loop textually
 * while closing it geometrically.
 */

/** Fractions of reach the band spans. Past 1 so it bleeds off the short edges. */
export const DASH_INNER = 0.42;
export const DASH_OUTER = 1.12;

/**
 * Exponent on the ring placement. Below 1 crowds rings toward the rim; 1 would
 * space them evenly and give back the uniform-hatch look.
 */
export const DASH_BIAS = 0.6;

/**
 * Arc a tick sweeps per loop, as a fraction of reach.
 *
 * An arc length rather than an angle, because equalising arc across radius is
 * the entire point — see the note above. Sized against the displacement floor
 * in the coherence suite rather than by eye.
 */
export const DASH_ARC = 0.11;

export default defineGenerator<Dash[]>({
  name: 'radial-dashes',
  label: 'Radial Dashes',
  description:
    'A dense annulus of short radial ticks, with the middle left open for something else.',
  group: 'radial',
  // Radial generators must slow themselves down: tangential speed is `ω · r`,
  // and this one's marks all live at large `r`. Slightly quicker than the
  // sibling because a tick travels its own length in far less arc than a spoke
  // does, so the same pace reads as calmer.
  speed: 0.7,
  defaults: { density: 0.5, strokeWidth: 1.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // The short edge, not the diagonal: the band has to leave a hole in the
    // *frame*, and a diagonal reach would push the inner radius past the top
    // and bottom edges and hide the hole off-screen.
    const reach = Math.min(p.width, p.height) * 0.62;
    const rings = Math.round(lerp(5, 10, p.density));
    // Arc length between neighbouring ticks. Constant across rings, which is
    // what keeps the angular texture even.
    const spacing = lerp(34, 18, p.density);
    const dashes: Dash[] = [];
    for (let i = 0; i < rings; i++) {
      const u = rings === 1 ? 1 : i / (rings - 1);
      const frac = lerp(DASH_INNER, DASH_OUTER, u ** DASH_BIAS);
      const r = frac * reach;
      // Every ring gets its own shear phase, so neighbouring rings slide
      // against each other instead of the band turning as one plate.
      const phase = range(rng, 0, TAU);
      // Offset per ring, so the ticks do not line up into accidental spokes —
      // which is precisely the sibling's look, and the thing to avoid here.
      const offset = range(rng, 0, TAU);
      const count = Math.max(6, Math.round((TAU * r) / spacing));
      // Normalised radius, and therefore the ramp position: this is the axis a
      // radial form is already about, so the inner edge of the band takes one
      // end of the ramp and the outer edge the other.
      const pos = (frac - DASH_INNER) / (DASH_OUTER - DASH_INNER);
      for (let k = 0; k < count; k++) {
        dashes.push({
          angle: offset + (k / count) * TAU,
          r,
          // Short, and that is the whole distinction from a spoke: a tick is a
          // fraction of the band's thickness, not a line to the centre.
          half: reach * range(rng, 0.028, 0.05),
          pos,
          phase,
          hot: chance(rng, 0.07 + p.density * 0.08),
        });
      }
    }
    return dashes;
  },
  project: (dashes, p, t) => {
    const [cx, cy] = centre(p);
    const reach = Math.min(p.width, p.height) * 0.62;
    const arc = DASH_ARC * reach;
    let out = '';
    for (const d of dashes) {
      // Equal arc for every tick: the angular sweep shrinks as the radius
      // grows, so the outer rings do not outrun the inner ones.
      const a = d.angle + (arc / d.r) * wobble(t, 1, d.phase);
      // A ripple travelling around the band, on whole cycles so it lands back
      // where it started. Four lobes, twice round the loop.
      const ripple = 1 + 0.045 * Math.sin(d.angle * 4 + t * TAU * 2);
      const r = d.r * ripple;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const stroke = d.hot ? ink(p, d.pos, 0.92) : ink(p, d.pos, 0.34);
      out += `<line x1="${r2(cx + ux * (r - d.half))}" y1="${r2(cy + uy * (r - d.half))}" x2="${r2(cx + ux * (r + d.half))}" y2="${r2(cy + uy * (r + d.half))}" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (d.hot ? 2.4 : 1))}" stroke-linecap="butt"/>`;
    }
    return frame(p, out);
  },
});
