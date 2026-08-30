import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  frame,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  withAlpha,
} from './shared';

/* ── interference ─────────────────────────────────────────────────────────── */

interface Source {
  x: number;
  y: number;
  freq: number;
  amp: number;
  orbit: number;
  orbitPhase: number;
  orbitCycles: number;
}

interface Field {
  sources: Source[];
  rows: number[];
  cols: number[];
}

/**
 * Two-source wave interference, drawn as displaced horizontal rules.
 *
 * The best fit in the set for the sample/project split, because the split is
 * doing real work rather than being satisfied: the *grid* is sampled once and
 * never moves, and the *sources* move, so every mark on screen is the same mark
 * from frame to frame while the whole surface reorganises. Interference figures
 * are also worth having because they are the one pattern here that is not
 * decomposable — the fringes exist only in the sum, so no amount of per-mark
 * wobble produces them.
 *
 * Each source orbits a whole number of times per loop, so the field is
 * identical at `t = 1` and `t = 0` without any term needing to be written as
 * `f(t) − f(0)`.
 */

export default defineGenerator<Field>({
  name: 'interference',
  label: 'Interference',
  description:
    'Two-source wave interference as displaced rules; the fringes exist only in the sum.',
  group: 'field',
  defaults: { density: 0.55, strokeWidth: 2 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Two or three. More sources do not read as more interference, they read as
    // noise — the fringes stop being traceable once there are enough of them.
    const count = intRange(rng, 2, 3);
    const sources: Source[] = [];
    for (let i = 0; i < count; i++) {
      sources.push({
        x: range(rng, p.width * 0.15, p.width * 0.85),
        y: range(rng, p.height * 0.15, p.height * 0.85),
        freq: range(rng, 0.012, 0.028),
        amp: range(rng, 10, 22),
        orbit: range(rng, 40, 130),
        orbitPhase: range(rng, 0, TAU),
        orbitCycles: intRange(rng, 1, 2),
      });
    }
    const gap = lerp(34, 12, p.density);
    const rows: number[] = [];
    for (let y = gap / 2; y < p.height; y += gap) rows.push(y);
    // Sample points along x. Fixed count, so the emitted number count cannot
    // change with t — the mark-count invariant is structural here, not lucky.
    const step = Math.max(6, Math.round(lerp(16, 7, p.density)));
    const cols: number[] = [];
    for (let x = 0; x <= p.width; x += step) cols.push(x);
    return { sources, rows, cols };
  },
  project: (f, p, t) => {
    const faint = withAlpha(p.accent, 0.34);
    const bright = withAlpha(p.accent, 0.9);
    // Sources first: every row reads the same moved sources, which is what makes
    // the fringes coherent rather than each row inventing its own.
    const at = f.sources.map((s) => {
      const a = s.orbitPhase + t * TAU * s.orbitCycles;
      return {
        x: s.x + Math.cos(a) * s.orbit,
        y: s.y + Math.sin(a) * s.orbit,
        freq: s.freq,
        amp: s.amp,
      };
    });
    let out = '';
    for (let i = 0; i < f.rows.length; i++) {
      const y0 = f.rows[i];
      let d = '';
      for (const x of f.cols) {
        let dy = 0;
        for (const s of at) {
          const dist = Math.hypot(x - s.x, y0 - s.y);
          // Amplitude falls off with distance, so a source reads as a source
          // rather than as a global modulation of the whole frame.
          dy += s.amp * Math.sin(dist * s.freq) * (1 / (1 + dist * 0.004));
        }
        d += `${d ? 'L' : 'M'}${r2(x)} ${r2(y0 + dy)}`;
      }
      const hot = i % 7 === 3;
      out += `<path d="${d}" fill="none" stroke="${hot ? bright : faint}" stroke-width="${r2(p.strokeWidth * (hot ? 1.8 : 0.9))}"/>`;
    }
    return frame(p, out);
  },
});
