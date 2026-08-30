import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  lerp,
  mulberry32,
  r2,
  range,
  smooth,
  TAU,
  withAlpha,
  wobble,
} from './shared';

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

export default defineGenerator<Flow>({
  name: 'flow-field',
  label: 'Flow Field',
  description:
    'Streamlines swimming along a vector field written as two crossed sines.',
  group: 'field',
  defaults: { density: 0.5, strokeWidth: 2 },
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
});
