import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  centre,
  chance,
  cycles,
  frame,
  ink,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  wobble,
} from './shared';

/* ── orbit-rings ──────────────────────────────────────────────────────────── */

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
 * Named for what it is, not for what inspired it. This began as an adaptation
 * of the reference's `modular_circle` and ended up nothing like it — that one
 * is a triangular lattice inside a hexagon with tangent line families radiating
 * off its vertices, a kaleidoscope. This is beads on rings. The kaleidoscope is
 * still worth building; it is not this.
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

export default defineGenerator<Orbit[]>({
  name: 'orbit-rings',
  label: 'Orbit Rings',
  description:
    'Rings of beads that gather toward a focus and scatter back, wandering an outer band.',
  group: 'radial',
  // Slower than the lattice generators, and the reason is geometric: a turn
  // at full reach covers the whole circumference, so what reads as a stately
  // rotation on a small form is a blur on a frame-filling one. See
  // `GeneratorModule.speed`.
  speed: 0.5,
  defaults: { density: 0.5, strokeWidth: 1.5 },
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
    // The centre is a parameter, not `width / 2`. The radial family exists so a
    // background can sit *behind* a title rather than merely under it, and that
    // only works if the rings can be pushed off to one side of the frame while
    // the words take the other. At the default origin this returns the frame
    // centre exactly, which is why adopting it moved no golden.
    const [cx, cy] = centre(p);
    const reach = Math.min(p.width, p.height) * 0.46;
    const bandWidth = reach / Math.max(1, rings.length);
    let out = '';
    for (const ring of rings) {
      const base = ring.r * reach;
      // A faint guide per ring. Without it the concentric structure never
      // reads: the points alone are just a scatter that happens to be round,
      // and the whole idea is that they are gathering *on* something.
      //
      // Position on the ramp is `ring.r` — the ring's radius as a fraction of
      // reach, which is the axis this generator is already about. Every other
      // property here (bead size, spin direction, focus) is per-ring noise;
      // radius is the one thing that is *ordered*, so it is the only choice
      // that produces a gradient the eye reads as structure rather than as
      // decoration: the innermost ring takes one end of the ramp and the
      // outermost the other, and the concentric form gains a second cue on top
      // of geometry. With a single accent `ink` is byte-identical to the old
      // `withAlpha(p.accent, …)` regardless of position, which is what let this
      // be adopted under the goldens.
      out += `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(base)}" fill="none" stroke="${ink(p, ring.r, 0.12)}" stroke-width="${r2(p.strokeWidth * 0.6)}"/>`;
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
        // The bead takes its ring's ramp position rather than its own wandered
        // radius, deliberately: the wander is a fifth of one band's width, so
        // sampling the ramp at it would only add a flicker of hue that has
        // nothing to do with which ring a bead belongs to. The ring is the
        // structure; the wander is texture on it.
        out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(pt.rad)}" fill="${ink(p, ring.r, pt.hot ? 0.98 : 0.68)}"/>`;
      }
    }
    return frame(p, out);
  },
});
