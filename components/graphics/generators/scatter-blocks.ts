import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  cycles,
  DRIFT_OF_FRAME,
  frame,
  intRange,
  lattice,
  lerp,
  mulberry32,
  r2,
  range,
  smooth,
  TAU,
  withAlpha,
  wobble,
} from './shared';

/* ── scatter-blocks ───────────────────────────────────────────────────────── */

interface Block {
  x: number;
  y: number;
  size: number;
  rot: number;
  roll: number;
}

/** Brutalist confetti: scattered rotated squares — outlined, faint, or solid. */

export default defineGenerator<Block[]>({
  name: 'scatter-blocks',
  label: 'Scatter Blocks',
  description: 'Brutalist confetti of rotated squares — outlined to solid.',
  group: 'lattice',
  defaults: { density: 0.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const count = Math.round(lerp(14, 76, p.density));
    const blocks: Block[] = [];
    for (let i = 0; i < count; i++) {
      const x = range(rng, 0, p.width);
      const y = range(rng, 0, p.height);
      const size = range(rng, 8, 46);
      const rot = intRange(rng, 0, 45);
      blocks.push({ x, y, size, rot, roll: rng() });
    }
    return blocks;
  },
  project: (blocks, p, t) => {
    const outline = withAlpha(p.accent, 0.5);
    const faint = withAlpha(p.accent, 0.22);
    const solid = withAlpha(p.accent, 0.95);
    let out = '';
    for (const b of blocks) {
      const style =
        b.roll < 0.18
          ? `fill="${solid}"`
          : b.roll < 0.5
            ? `fill="${faint}"`
            : `fill="none" stroke="${outline}" stroke-width="${p.strokeWidth}"`;
      // A rock, not a spin. Whole turns would also close the loop, but only
      // *geometrically* — `rot + 720` and `rot` draw the same square while
      // being different strings, and normalising with `% 360` trades that for a
      // 360-unit jump at the wrap point, which is a discontinuity in everything
      // downstream even though the image is smooth. Oscillating keeps one rule
      // for the whole file and no exceptions in the tests. It also reads better:
      // two full revolutions per loop is fast enough to pull the eye off
      // whatever the background is sitting behind.
      const k = cycles(b.size, 2);
      const phase = b.roll * TAU;
      const swing = 40 * (b.roll < 0.5 ? 1 : -1);
      // Rotation alone moves one number per block, so the frame stayed almost
      // still even at 48px of peak swing — the corners travelled, nothing a
      // viewer tracks did. Drifting the block puts the motion into the
      // coordinates as well.
      const x = b.x + DRIFT_OF_FRAME * 320 * wobble(t, k, phase);
      const y = b.y + DRIFT_OF_FRAME * 320 * wobble(t, k, phase + Math.PI / 2);
      // Rounded like every other emitted number. Without it the loop closes
      // geometrically but not textually: `sin(2πk + φ)` differs from `sin(φ)` in
      // the last few bits, and this is the one value the original printed raw.
      const rot = r2(b.rot + swing * wobble(t, k, phase));
      out += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(b.size)}" height="${r2(b.size)}" transform="rotate(${rot} ${r2(x + b.size / 2)} ${r2(y + b.size / 2)})" ${style}/>`;
    }
    return frame(p, out);
  },
});
