import { defineGenerator } from '../types';
import {
  cycles,
  frame,
  ink,
  lerp,
  mulberry32,
  r2,
  range,
  wobble,
} from './shared';

interface Mark {
  x: number;
  y: number;
  r: number;
  ph: number;
}

// PLACEHOLDER — a variant of `truchet-arcs`. Replace with the real implementation.
export default defineGenerator<Mark[]>({
  name: 'truchet-mirror',
  label: 'Truchet Mirror',
  description:
    'Mirrored tiles, so arcs meet as butterflies rather than carrying straight through.',
  group: 'lattice',
  speed: 0.9,
  defaults: { density: 0.5 },

  sample: (p) => {
    const rng = mulberry32(p.seed + 101);
    const gap = lerp(130, 70, p.density);
    const out: Mark[] = [];
    for (let y = gap / 2; y < p.height; y += gap) {
      for (let x = gap / 2; x < p.width; x += gap) {
        out.push({ x, y, r: range(rng, 3, 9), ph: range(rng, 0, 6.28) });
      }
    }
    return out;
  },

  project: (marks, p, t) => {
    let s = '';
    for (const m of marks) {
      const k = cycles(m.r, 2);
      s += `<circle cx="${r2(m.x + 30 * wobble(t, k, m.ph))}" cy="${r2(m.y + 30 * wobble(t, k, m.ph + 1.57))}" r="${r2(m.r)}" fill="${ink(p, m.x / p.width, 0.5)}"/>`;
    }
    return frame(p, s);
  },
});
