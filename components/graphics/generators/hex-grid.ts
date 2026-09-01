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

/* ── hex-grid ─────────────────────────────────────────────────────────────── */

/**
 * A wave sweeping across a tiling.
 *
 * Grid generators wobble each mark independently, which reads as texture rather
 * than motion. A tiling can do better: drive every cell from one field that
 * depends on where the cell is, and the whole surface moves together.
 *
 * `k` is cycles across the frame and `m` whole cycles per loop, so this closes
 * at `t = 1` for the same reason `contour` does. Returns 0..1.
 */

/** Honeycomb, lit by a wave crossing it. */

export default defineGenerator<Tiled>({
  name: 'hex-grid',
  label: 'Hex Grid',
  description:
    'Honeycomb lit by a wave crossing it; cells breathe with the field.',
  group: 'lattice',
  sketch: true,
  defaults: { density: 0.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cells = lattice('hex', {
      width: p.width,
      height: p.height,
      size: lerp(78, 30, p.density),
    });
    // One draw per cell, in lattice order — the rng decides which cells are
    // interesting, the lattice decides where they are, and the two stay
    // independent so a density change moves cells without re-rolling them all.
    return { cells, rolls: cells.map(() => rng()) };
  },
  project: ({ cells, rolls }, p, t) => {
    let out = '';
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      // Two waves at coprime rates, one horizontal and one diagonal, so the
      // pattern never settles into an obvious stripe.
      const a = wave(c.cx / p.width, t, 2, 1);
      const b = wave((c.cx + c.cy) / (p.width + p.height), t, 3, 2);
      const energy = (a + b) / 2;
      // Every cell always carries a fill, and only its alpha moves.
      //
      // Thresholding this field into lit/unlit was the obvious way to write it
      // and is wrong: `fill="none"` and `fill="rgba(…)"` are different shapes,
      // so a cell crossing the threshold pops rather than fades. `iso-grid` gets
      // away with the same ternary because what it switches on is *sampled* and
      // therefore never changes mid-loop; this field varies with `t`, so it
      // cannot be. The coherence suite catches it as a change in mark count.
      const weight = 1 - rolls[i];
      const d = scaledPath(c, 0.72 + energy * 0.26, r2);
      // The dominant wave travels along x, so x is the direction the light
      // moves; ramping on it means the crest picks up hue as it crosses rather
      // than merely brightening, and the honeycomb keeps one gradient while
      // the field animates over it. Fixed to `c.cx`, not to `energy`, so the
      // colour belongs to the cell and the wave passes through it.
      const pos = c.cx / p.width;
      out += `<path d="${d}" fill="${ink(p, pos, r2(0.02 + weight * energy * 0.6))}" stroke="${ink(p, pos, 0.3)}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
});
