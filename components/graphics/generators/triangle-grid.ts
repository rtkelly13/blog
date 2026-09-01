import { defineGenerator } from '../types';
import type { Rng, Tiled } from './shared';
import {
  frame,
  ink,
  lattice,
  lerp,
  mulberry32,
  r2,
  scaledPath,
  wave,
} from './shared';

/* ── triangle-grid ────────────────────────────────────────────────────────── */

/**
 * Alternating triangles, the two orientations driven in antiphase.
 *
 * The up- and down-pointing cells are offset by half a cycle, so the surface
 * shimmers between two interlocking states rather than pulsing as one — which
 * is the thing a triangular tiling can do that a square one cannot.
 */

export default defineGenerator<Tiled>({
  name: 'triangle-grid',
  label: 'Triangle Grid',
  description:
    'Interlocking triangles, the two orientations driven in antiphase.',
  group: 'lattice',
  sketch: true,
  defaults: { density: 0.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cells = lattice('triangle', {
      width: p.width,
      height: p.height,
      size: lerp(150, 62, p.density),
    });
    return { cells, rolls: cells.map(() => rng()) };
  },
  project: ({ cells, rolls }, p, t) => {
    let out = '';
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const u = (c.cx / p.width + c.cy / p.height) / 2;
      // The half-turn offset is the whole idea: the two orientations are never
      // bright at once.
      const energy = wave(u + (c.flipped ? 0.5 : 0), t, 2, 1);
      // Continuous alpha, for the reason spelled out in `hex-grid`.
      const weight = 1 - rolls[i];
      const d = scaledPath(c, 0.62 + energy * 0.34, r2);
      // `u` is already the coordinate the travelling field is evaluated at —
      // the diagonal the shimmer sweeps along — so it is the axis this
      // generator is about, and reusing it puts the ramp exactly under the
      // motion instead of across it. The antiphase offset is deliberately not
      // included: it belongs to the timing, not to where the cell sits.
      const fill = ink(p, u, r2(0.02 + weight * energy * 0.62));
      out += `<path d="${d}" fill="${fill}" stroke="${ink(p, u, 0.26)}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
});
