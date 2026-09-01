import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  disorderAt,
  frame,
  ink,
  lerp,
  mulberry32,
  r2,
  scramble,
  wobble,
} from './shared';

/* ── iso-grid ─────────────────────────────────────────────────────────────── */

interface Cell {
  cx: number;
  cy: number;
  flare: boolean;
  filled: boolean;
}

/** Isometric lattice of diamonds; some cells fill with faint accent. */

export default defineGenerator<Cell[]>({
  name: 'iso-grid',
  label: 'Iso Grid',
  description: 'Isometric lattice of diamonds; some cells fill with accent.',
  group: 'isometric',
  sketch: true,
  // Filled cells cover most of the frame, and on paper that is a grey wash
  // rather than the recessive tone it reads as on black.
  sketchWeight: 0.5,
  defaults: { density: 0.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Cell floor raised for the element budget: 52px gave 1,377 diamonds.
    const cw = lerp(120, 68, p.density);
    const ch = cw * 0.58;
    const cells: Cell[] = [];
    for (let row = -1; row * ch * 0.5 < p.height + ch; row++) {
      for (let col = -1; col * cw < p.width + cw; col++) {
        const flare = chance(rng, 0.05 + p.density * 0.1);
        // The original nests the second draw inside a ternary, so a flaring
        // cell never makes it. Preserving that short-circuit is what keeps the
        // stream — and therefore every later cell — identical.
        const filled = flare ? false : chance(rng, 0.12);
        const cx = col * cw + (row % 2 ? cw / 2 : 0);
        const cy = (row * ch) / 2;
        const chaos = disorderAt(p, cy);
        cells.push({
          cx: cx + chaos * cw * 0.5 * scramble(cx, cy, 3),
          cy: cy + chaos * ch * 0.5 * scramble(cx, cy, 4),
          flare,
          filled,
        });
      }
    }
    return cells;
  },
  project: (cells, p, t) => {
    const cw = lerp(120, 52, p.density);
    const ch = cw * 0.58;
    let out = '';
    for (const c of cells) {
      // The lattice cannot move without tearing, so the diamonds themselves
      // breathe about their centres.
      const s =
        1 + 0.3 * wobble(t, cycles(c.cx + c.cy, 2), (c.cx - c.cy) * 0.01);
      const hw = (cw / 2) * s;
      const hh = (ch / 2) * s;
      const path = `M${r2(c.cx)} ${r2(c.cy - hh)} L${r2(c.cx + hw)} ${r2(c.cy)} L${r2(c.cx)} ${r2(c.cy + hh)} L${r2(c.cx - hw)} ${r2(c.cy)} Z`;
      // `cx + cy` is the lattice's own axis: it counts steps along the
      // isometric diagonal, the direction the rows actually recede in. A ramp
      // laid on it reads as the plane going away from the viewer, where plain
      // x or y would cut across the tiling.
      const pos = (c.cx / p.width + c.cy / p.height) / 2;
      const fill = c.flare
        ? ink(p, pos, 0.85)
        : c.filled
          ? ink(p, pos, 0.22)
          : 'none';
      out += `<path d="${path}" fill="${fill}" stroke="${ink(p, pos, 0.36)}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
});
