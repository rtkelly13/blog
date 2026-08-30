import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  frame,
  lattice,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  withAlpha,
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

export default defineGenerator<Wheel>({
  name: 'radial-spokes',
  label: 'Radial Spokes',
  description:
    'Spokes and rings about a centre — the one background with a middle to sit behind.',
  group: 'radial',
  defaults: { density: 0.5, strokeWidth: 1.5 },
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
});
