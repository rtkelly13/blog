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

/* ── broken-ring ──────────────────────────────────────────────────────────── */

interface RingBand {
  /** Inner and outer radius as fractions of reach. */
  r0: number;
  r1: number;
  /** Cells around the band. */
  cells: { fill: boolean; hot: boolean }[];
  /** Whole cycles per loop, signed — adjacent bands counter-rotate. */
  spin: number;
  phase: number;
}

/**
 * Concentric polygon bands, cut into cells, most of them missing.
 *
 * The reference's *Broken Ring*. Its whole character is the negative space —
 * a complete annulus is a target, and one with two thirds of its cells knocked
 * out is a structure. The bands are polygonal rather than circular, so the
 * facets catch the rotation; a true circle rotating is invisible.
 *
 * Bands counter-rotate at their own whole-cycle rates, which is the dynamism a
 * centred form can have that an edge-to-edge texture cannot: there is a fixed
 * middle for the eye to hold while everything around it shears past.
 */

export default defineGenerator<RingBand[]>({
  name: 'broken-ring',
  label: 'Broken Ring',
  description:
    'Counter-rotating polygon bands, mostly missing — the negative space is the structure.',
  group: 'radial',
  defaults: { density: 0.5, strokeWidth: 1.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const bands = Math.round(lerp(4, 9, p.density));
    const perBand = Math.round(lerp(14, 30, p.density));
    const out: RingBand[] = [];
    for (let i = 0; i < bands; i++) {
      const r0 = 0.16 + (i / bands) * 0.78;
      const r1 = r0 + (0.78 / bands) * 0.78;
      const cells = Array.from({ length: perBand }, () => ({
        fill: chance(rng, 0.34),
        hot: chance(rng, 0.08),
      }));
      out.push({
        r0,
        r1,
        cells,
        // Signed, so neighbouring bands turn opposite ways and the gaps between
        // them shear rather than sliding as a block.
        //
        // One turn per loop, never two. `cycles(v, 2)` would sometimes return
        // 2, and at this reach that doubles the rim to roughly 470px/s — the
        // speed `radial-spokes` was called out for. One revolution per loop is
        // about 5rpm and reads as stately.
        spin: cycles(rng(), 1) * (i % 2 ? -1 : 1),
        phase: range(rng, 0, TAU),
      });
    }
    return out;
  },
  project: (bands, p, t) => {
    const cx = p.width / 2;
    const cy = p.height / 2;
    const reach = Math.min(p.width, p.height) * 0.62;
    const edge = withAlpha(p.accent, 0.34);
    let out = '';
    for (const band of bands) {
      const n = band.cells.length;
      const step = TAU / n;
      // Rotation consumed by cos/sin rather than printed as a `rotate()`:
      // `360` and `0` draw the same picture and are different strings, so a
      // printed whole turn would fail the loop-closure test that this passes.
      const spin = band.phase + t * TAU * band.spin;
      const inner = band.r0 * reach;
      const outer = band.r1 * reach;
      for (let i = 0; i < n; i++) {
        const cell = band.cells[i];
        const a0 = spin + i * step;
        const a1 = a0 + step * 0.86;
        const pt = (a: number, r: number) =>
          `${r2(cx + Math.cos(a) * r)},${r2(cy + Math.sin(a) * r)}`;
        // Every cell is emitted whether or not it is filled — an omitted cell
        // would change the emitted-number count with the sample, which is what
        // the confetti test watches for.
        const fill = cell.hot
          ? withAlpha(p.accent, 0.9)
          : cell.fill
            ? withAlpha(p.accent, 0.22)
            : 'none';
        out += `<polygon points="${pt(a0, inner)} ${pt(a1, inner)} ${pt(a1, outer)} ${pt(a0, outer)}" fill="${fill}" stroke="${cell.fill || cell.hot ? edge : 'none'}" stroke-width="${p.strokeWidth}"/>`;
      }
    }
    return frame(p, out);
  },
});
