import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  frame,
  ink,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  valueNoise,
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
  seed: number;
  quills: Quill[];
  /** Field scale, sampled once — the field's shape, not its phase. */
  a: number;
  b: number;
}

/** Radians the field sways through per loop. */
/**
 * How far the sample point travels around its circle in noise space per loop.
 *
 * Small: the field should evolve, not churn. At 0.35 a quill's angle drifts
 * through most of a turn over the loop while its neighbours drift with it.
 */
const FIELD_WALK = 0.35;

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
  sketch: true,
  defaults: { density: 0.5, strokeWidth: 2 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Wider floor than the look alone wants: at a 26px gap this emitted
    // 1,530 quills at density 1, over the element budget.
    const gap = lerp(64, 36, p.density);
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
      seed: intRange(rng, 1, 9999),
      quills,
      // Field scale in noise units across the frame. Around three gives sweeps
      // a few quills wide; much higher and it degenerates into per-mark noise.
      a: range(rng, 2.4, 3.6),
      b: range(rng, 1.4, 2.2),
    };
  },
  project: (f, p, t) => {
    // The field walks a circle through noise space.
    //
    // It used to be two crossed sines, and that is *separable* — a function of
    // x plus a function of y — which is precisely why it banded. Whole rows
    // shared an angle and the frame read as horizontal stripes of near-parallel
    // dashes. No amount of tuning the amplitudes fixes a field whose two axes
    // never interact.
    //
    // Noise is not separable, so neighbouring quills agree without whole rows
    // agreeing. Offsetting the sample point around a circle animates it and
    // closes the loop exactly, for the same reason `ridgeline` does it: a
    // circle returns to where it started.
    const ox = FIELD_WALK * Math.cos(t * TAU);
    const oy = FIELD_WALK * Math.sin(t * TAU);
    let out = '';
    for (const q of f.quills) {
      const nx = (q.x / p.width) * f.a + ox;
      const ny = (q.y / p.height) * f.b + oy;
      // Two octaves: the coarse one sets the sweep, the fine one keeps
      // neighbours from marching in lockstep.
      const angle =
        (valueNoise(nx, ny, f.seed) * 2 - 1) * TAU * 0.75 +
        (valueNoise(nx * 2.7, ny * 2.7, f.seed + 31) * 2 - 1) * 0.55 +
        q.skew;
      // Length from a second, slower field, so the frame has quiet stretches
      // and busy ones instead of one uniform weight everywhere. A flow field
      // drawn at constant weight is a texture; varying it is what gives the
      // eye somewhere to go.
      const weight = valueNoise(nx * 0.6 + 11, ny * 0.6 - 7, f.seed + 97);
      const len = q.len * (0.45 + 1.15 * weight);
      const dx = (Math.cos(angle) * len) / 2;
      const dy = (Math.sin(angle) * len) / 2;
      const alpha = q.hot ? 0.95 : r2(0.16 + 0.42 * weight);
      // Position on the ramp is `weight` — the second, slower field this
      // generator already samples to decide where the frame is quiet and where
      // it is busy. Colour therefore rides the same large-scale structure as
      // length and alpha already do, rather than cutting across it: a calm
      // stretch is one hue throughout, a busy one another, and the boundary
      // between them is the field's own, not a stripe painted over it.
      const stroke = ink(p, weight, alpha);
      out += `<line x1="${r2(q.x - dx)}" y1="${r2(q.y - dy)}" x2="${r2(q.x + dx)}" y2="${r2(q.y + dy)}" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (q.hot ? 1.8 : 0.85))}" stroke-linecap="round"/>`;
    }
    return frame(p, out);
  },
});
