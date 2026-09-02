import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  ink,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
} from './shared';

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

export default defineGenerator<Band[]>({
  name: 'contour',
  label: 'Contour',
  description: 'Stacked topographic waves with occasional bright bands.',
  group: 'terrain',
  sketch: true,
  defaults: { density: 0.6, strokeWidth: 2 },
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
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      // The stack is already a depth ordering — band 0 at the top of the frame
      // through to the last at the bottom — so its index through the stack is
      // the axis this generator is about, and the ramp reads as the terrain
      // receding rather than as a recolouring.
      const depth = bands.length === 1 ? 1 : i / (bands.length - 1);
      const stroke = ink(p, depth, b.hot ? 0.9 : 0.32);
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
});
