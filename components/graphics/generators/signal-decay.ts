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
  TAU,
  withAlpha,
} from './shared';

/* ── signal-decay ─────────────────────────────────────────────────────────── */

interface Rule {
  /** Position in the stack, -0.5 at the top rule to +0.5 at the bottom. */
  slot: number;
  /** Peak amplitude at the centre of the frame, in viewBox units. */
  amp: number;
  /** Cycles across the frame at full envelope; the count actually drawn is lower. */
  freq: number;
  /** Where in the waveform this rule starts, so the stack does not comb up. */
  phase: number;
  /** Whole cycles the wave travels along x per loop — integer, so `t = 1` closes. */
  travel: number;
  /** A few rules carry the full accent, the rest are ghosts of it. */
  hot: boolean;
}

/**
 * Stacked rules oscillating under a lens-shaped envelope, flat at both edges.
 *
 * A carrier arriving clean in the middle of the frame and decaying to nothing
 * at the margins: amplitude *and* frequency ride the same window, so the wave
 * does not merely shrink at the edges, it runs out of cycles and lands as a
 * straight rule. That is the difference between a signal fading and a signal
 * being turned down — only the first one flattens.
 *
 * The window is `cos²`, which is exactly zero at both edges rather than
 * asymptotically small, so the outer sample points are genuinely collinear.
 * A gaussian left a visible residual wobble at the margins that read as noise
 * in the rendering rather than as the end of the signal.
 *
 * Frequency varying with x cannot be evaluated as `sin(k(x)·x)` — that shears
 * the waveform and puts a discontinuity wherever `k` changes fastest. The
 * phase is accumulated along the trace instead (`φ += k(x)·dx`), which is the
 * integral the closed form is an approximation of, and is continuous by
 * construction.
 *
 * A second envelope runs down the stack, so the rules nearest the vertical
 * centre swing widest and the outermost are already flat. Horizontal window ×
 * vertical window is what makes the ink bulge into a lens rather than into a
 * band with soft ends.
 */

export default defineGenerator<Rule[]>({
  name: 'signal-decay',
  label: 'Signal Decay',
  description:
    'Stacked oscillating rules under an envelope that decays across the frame.',
  group: 'terrain',
  defaults: { density: 0.55, strokeWidth: 1.5 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const count = Math.round(lerp(14, 46, p.density));
    const rules: Rule[] = [];
    for (let i = 0; i < count; i++) {
      // Distance from the middle of the stack, 0 at the centre rule and 1 at
      // the outermost. Squared-cosine again, so the lens is symmetric in both
      // axes and the top and bottom rules are drawn as dead-straight hairlines.
      const v = (i + 0.5) / count - 0.5;
      const lens = Math.cos(v * Math.PI) ** 2;
      // Every rule draws the same four values in the same order whatever the
      // density, so the stream stays aligned rule-for-rule as the count moves.
      const jitter = rng();
      rules.push({
        slot: v,
        amp: lerp(2, 46, lens) * range(rng, 0.75, 1.25),
        freq: range(rng, 3.5, 7),
        phase: range(rng, 0, TAU),
        // Derived from a value already drawn rather than from a fresh call —
        // an extra `rng()` here would shift every later rule down the stream
        // and re-roll the composition the moment the density changed.
        travel: cycles(jitter, 3),
        hot: chance(rng, 0.12),
      });
    }
    return rules;
  },

  project: (rules, p, t) => {
    // Fixed regardless of density: the emitted-number count has to be identical
    // at every `t`, and a trace resolution derived from anything sampled would
    // be one more thing that could move it.
    const STEPS = 128;
    const dx = p.width / STEPS;
    const cx = p.width / 2;
    const cy = p.height / 2;
    let out = '';
    for (const rule of rules) {
      // The travelling term. Whole cycles per loop consumed by `sin`, so at
      // `t = 1` the argument has advanced by an exact multiple of 2π and the
      // frame is byte-identical to `t = 0`.
      const drift = t * TAU * rule.travel;
      let phase = rule.phase;
      let d = '';
      for (let i = 0; i <= STEPS; i++) {
        const x = i * dx;
        // The shared window: one number that gates how tall the wave is and
        // how fast it turns over. Coupling them is the whole effect.
        const u = ((x - cx) / p.width) * Math.PI;
        // Fourth power, not second: `cos²` spread the oscillation over the
        // whole width and read as an even texture with slightly quieter ends.
        // The lens only appears once the wave is confined to the middle third
        // and the outer thirds are unambiguously flat.
        const env = Math.cos(u) ** 4;
        // The stack itself breathes with the same window — full height where
        // the signal is live, squeezed towards the middle where it has died.
        // Amplitude alone gives a band with soft ends; this is what makes the
        // silhouette an eye. Squeezing rather than splaying keeps every rule
        // inside the frame, so nothing is lost off the top and bottom edges.
        const y =
          cy +
          rule.slot * p.height * lerp(0.62, 1.02, env) +
          Math.sin(phase - drift) * rule.amp * env;
        d += `${i === 0 ? 'M' : 'L'}${r2(x)} ${r2(y)} `;
        // Advance *after* plotting so the first point sits at the sampled
        // phase; the increment is the local frequency times the step.
        phase += (TAU * rule.freq * env * dx) / p.width;
      }
      const stroke = rule.hot
        ? withAlpha(p.accent, 0.85)
        : withAlpha(p.accent, 0.3);
      out += `<path d="${d.trim()}" fill="none" stroke="${stroke}" stroke-width="${r2(rule.hot ? p.strokeWidth * 1.6 : p.strokeWidth)}"/>`;
    }
    return frame(p, out);
  },
});
