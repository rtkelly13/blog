import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  frame,
  ink,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
} from './shared';

/* ── interference ─────────────────────────────────────────────────────────── */

/**
 * A wave source at rest, plus the circular path it walks during the loop.
 *
 * Exported because `resonance` and `ripple` are the same physics with a
 * different source count and a different set of marks; sharing the type is what
 * lets them share {@link orbitSources} and {@link waveAt} rather than
 * re-deriving a falloff that happens to look similar.
 */
export interface Source {
  x: number;
  y: number;
  freq: number;
  amp: number;
  orbit: number;
  orbitPhase: number;
  orbitCycles: number;
}

/** A source at time `t` — position resolved, the rest carried through. */
export interface MovedSource {
  x: number;
  y: number;
  freq: number;
  amp: number;
}

/**
 * How fast a source's contribution fades with distance, per pixel.
 *
 * Without it every source modulates the entire frame equally and the figure
 * reads as one global ripple rather than as several sources; with it, a source
 * has a *place*, which is what makes the fringes locatable.
 */
export const WAVE_FALLOFF = 0.004;

/**
 * Every source moved to its position at `t`.
 *
 * `orbitCycles` is a whole number, so at `t = 1` every source is exactly where
 * it started and the field is identical to `t = 0` without any term needing to
 * be written as `f(t) − f(0)`.
 */
export const orbitSources = (sources: Source[], t: number): MovedSource[] =>
  sources.map((s) => {
    const a = s.orbitPhase + t * TAU * s.orbitCycles;
    return {
      x: s.x + Math.cos(a) * s.orbit,
      y: s.y + Math.sin(a) * s.orbit,
      freq: s.freq,
      amp: s.amp,
    };
  });

/**
 * Scalar wave height at a point — the sum every fringe exists in.
 *
 * Summed rather than combined any other way because superposition is the whole
 * subject: the fringes are in the sum and nowhere else, which is why no amount
 * of per-mark wobble reproduces them.
 */
export const waveAt = (at: MovedSource[], x: number, y: number): number => {
  let dy = 0;
  for (const s of at) {
    const dist = Math.hypot(x - s.x, y - s.y);
    // Amplitude falls off with distance, so a source reads as a source
    // rather than as a global modulation of the whole frame.
    dy += s.amp * Math.sin(dist * s.freq) * (1 / (1 + dist * WAVE_FALLOFF));
  }
  return dy;
};

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
  sketch: true,
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
    // Sources first: every row reads the same moved sources, which is what makes
    // the fringes coherent rather than each row inventing its own.
    const at = orbitSources(f.sources, t);
    let out = '';
    for (let i = 0; i < f.rows.length; i++) {
      const y0 = f.rows[i];
      let d = '';
      for (const x of f.cols) {
        const dy = waveAt(at, x, y0);
        d += `${d ? 'L' : 'M'}${r2(x)} ${r2(y0 + dy)}`;
      }
      const hot = i % 7 === 3;
      // Position on the ramp is the row's place down the frame — the one axis
      // a field of horizontal rules already has, and the one a reader can see
      // without being told. The alternative was local displacement magnitude,
      // which is the more "meaningful" quantity but varies along a single rule,
      // so it could only be applied per-segment: hundreds of stroke colours per
      // row, a much larger file, and a gradient that reads as noise because it
      // reorganises every frame. A frozen top-to-bottom ramp instead lets the
      // fringes stay the figure and the colour stay the ground.
      //
      // With a single accent this is byte-identical to the `withAlpha(p.accent,
      // …)` it replaces, which is what lets it be adopted under a golden.
      const pos = f.rows.length === 1 ? 0 : i / (f.rows.length - 1);
      const stroke = ink(p, pos, hot ? 0.9 : 0.34);
      out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (hot ? 1.8 : 0.9))}"/>`;
    }
    return frame(p, out);
  },
});
