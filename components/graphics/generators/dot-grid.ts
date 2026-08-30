import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  disorderAt,
  frame,
  lerp,
  mulberry32,
  ORBIT_OF_CELL,
  r2,
  range,
  scramble,
  withAlpha,
  wobble,
} from './shared';

/* ── dot-grid ─────────────────────────────────────────────────────────────── */

interface Dot {
  x: number;
  y: number;
  rad: number;
  hot: boolean;
}

/** Grid of dots with jittered radius; a scatter of them flare to full accent. */

export default defineGenerator<Dot[]>({
  name: 'dot-grid',
  label: 'Dot Grid',
  description: 'Regular grid of dots with a scatter flaring to full accent.',
  group: 'lattice',
  defaults: { density: 0.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const spacing = lerp(96, 34, p.density);
    const dots: Dot[] = [];
    for (let y = spacing / 2; y < p.height; y += spacing) {
      for (let x = spacing / 2; x < p.width; x += spacing) {
        const hot = chance(rng, 0.06 + p.density * 0.14);
        const rad =
          (hot ? range(rng, 2.5, 4.5) : range(rng, 1, 2.4)) * (spacing / 40);
        // The strict grid comes apart as it falls. Bounded by roughly one cell,
        // so the lattice dissolves rather than turning into a scatter that
        // happens to have started as a grid.
        const chaos = disorderAt(p, y);
        dots.push({
          x: x + chaos * spacing * 0.95 * scramble(x, y, 1),
          y: y + chaos * spacing * 0.6 * scramble(x, y, 2),
          rad,
          hot,
        });
      }
    }
    return dots;
  },
  // Each dot orbits inside its own cell. The lattice cannot translate as a
  // whole — its marks are individually sampled, so sliding it by one cell would
  // pair every position with a different dot — but a per-dot orbit bounded by
  // the cell moves plainly without ever colliding or leaving a bare edge.
  project: (dots, p, t) => {
    const faint = withAlpha(p.accent, 0.4);
    const bright = withAlpha(p.accent, 0.95);
    const orbit = lerp(96, 34, p.density) * ORBIT_OF_CELL;
    let out = '';
    for (const d of dots) {
      const k = cycles(d.rad, 2);
      const phase = (d.x + d.y) * 0.01;
      const cx = d.x + orbit * wobble(t, k, phase);
      const cy = d.y + orbit * wobble(t, k, phase + Math.PI / 2);
      const rad = d.rad * (1 + 0.4 * wobble(t, k, phase));
      out += `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(rad)}" fill="${d.hot ? bright : faint}"/>`;
    }
    return frame(p, out);
  },
});
