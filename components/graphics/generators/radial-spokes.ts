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

export const SPOKE_ARC = 0.2;

/**
 * The band of reach a spoke tip lands in, as a fraction of the wheel's reach.
 *
 * Named rather than inlined because the same two numbers do two jobs: they are
 * the range the tips are drawn from, and they are the range the ramp position
 * is normalised against. Sampling `[0.55, 1]` and then handing `outer / reach`
 * straight to `ink()` would confine every spoke to the top half of the ramp and
 * throw away the colours at the near end; normalising against the band the
 * spokes actually occupy spends the whole ramp on the variation that exists.
 */
export const SPOKE_OUTER_MIN = 0.55;
export const SPOKE_OUTER_MAX = 1;

export default defineGenerator<Wheel>({
  name: 'radial-spokes',
  label: 'Radial Spokes',
  description:
    'Spokes and rings about a centre — the one background with a middle to sit behind.',
  group: 'radial',
  sketch: true,
  // Slower than the lattice generators, and the reason is geometric: a turn
  // at full reach covers the whole circumference, so what reads as a stately
  // rotation on a small form is a blur on a frame-filling one. See
  // `GeneratorModule.speed`.
  speed: 0.75,
  defaults: { density: 0.5, strokeWidth: 1.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Not the frame centre: `centre()` honours `originX`/`originY`, which is
    // what lets this sit behind a title rather than on top of one. The default
    // origin is (0.5, 0.5), so the sampled wheel is unmoved.
    const [cx, cy] = centre(p);
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
        outer: reach * range(rng, SPOKE_OUTER_MIN, SPOKE_OUTER_MAX),
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
    // Position on the ramp is **normalised radius**, which is the axis a radial
    // form is already about: the hub takes one end of the ramp and the rim the
    // other, so distance from the centre is carried by hue as well as by
    // weight. Anything else — the spoke index, say — would produce a pinwheel
    // of colour that fights the geometry instead of describing it.
    //
    // With a single accent `ink(p, …, a)` is `withAlpha(p.accent, a)` byte for
    // byte, which is why this could be adopted under the goldens.
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
      // Where this spoke's tip sits within the band tips are drawn from.
      const pos =
        (s.outer / w.reach - SPOKE_OUTER_MIN) /
        (SPOKE_OUTER_MAX - SPOKE_OUTER_MIN);
      const stroke = s.hot ? ink(p, pos, 0.95) : ink(p, pos, 0.3);
      out += `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (s.hot ? 2.2 : 1))}"/>`;
    }
    for (const ring of w.rings) {
      const r = ring.r * (1 + 0.06 * Math.sin(t * TAU * 2 + ring.r * 0.02));
      // A ring is a single radius, so its own radius *is* its ramp position —
      // the sampled one, not the pulsing one, since a ring changing hue as it
      // breathes would read as a flicker rather than as depth.
      const pos = ring.r / w.reach;
      const stroke = ring.hot ? ink(p, pos, 0.95) : ink(p, pos, 0.4);
      out += `<circle cx="${r2(w.cx)}" cy="${r2(w.cy)}" r="${r2(r)}" fill="none" stroke="${stroke}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
});
