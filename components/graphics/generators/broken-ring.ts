import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  centre,
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

/**
 * Innermost radius, and the span the bands are laid out across, as fractions of
 * reach.
 *
 * Named because they are also what the ramp position is normalised against: a
 * band's mid-radius alone would only ever reach 0.94 and never start below
 * 0.16, so handing it to `ink()` raw would leave both ends of the ramp unspent.
 */
const RING_INNER = 0.16;
const RING_SPAN = 0.78;

export default defineGenerator<RingBand[]>({
  name: 'broken-ring',
  label: 'Broken Ring',
  description:
    'Counter-rotating polygon bands, mostly missing — the negative space is the structure.',
  group: 'radial',
  sketch: true,
  // Slower than the lattice generators, and the reason is geometric: a turn
  // at full reach covers the whole circumference, so what reads as a stately
  // rotation on a small form is a blur on a frame-filling one. See
  // `GeneratorModule.speed`.
  speed: 0.5,
  defaults: { density: 0.5, strokeWidth: 1.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const bands = Math.round(lerp(4, 9, p.density));
    const perBand = Math.round(lerp(14, 30, p.density));
    const out: RingBand[] = [];
    for (let i = 0; i < bands; i++) {
      const r0 = RING_INNER + (i / bands) * RING_SPAN;
      const r1 = r0 + (RING_SPAN / bands) * 0.78;
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
    // `centre()` rather than the frame centre: the radial family exists so a
    // background can sit *behind* a title, which needs the hole in the middle
    // to be movable. The default origin is (0.5, 0.5), so nothing shifts.
    const [cx, cy] = centre(p);
    const reach = Math.min(p.width, p.height) * 0.62;
    let out = '';
    for (const band of bands) {
      // Position on the ramp is **normalised radius** — the axis the form is
      // already about. The innermost band takes one end of the ramp and the
      // outermost the other, so the annulus reads as a gradient outward rather
      // than as a flat colour cut into cells; a per-cell position would instead
      // spin colour around the ring and fight the rotation.
      //
      // A whole band shares one position, since a band *is* one radius: the
      // cells within it differ in weight, not in distance.
      //
      // With a single accent this is `withAlpha(p.accent, a)` byte for byte,
      // which is what let it be adopted under the goldens.
      const pos = ((band.r0 + band.r1) / 2 - RING_INNER) / RING_SPAN;
      const edge = ink(p, pos, 0.34);
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
          ? ink(p, pos, 0.9)
          : cell.fill
            ? ink(p, pos, 0.22)
            : 'none';
        out += `<polygon points="${pt(a0, inner)} ${pt(a1, inner)} ${pt(a1, outer)} ${pt(a0, outer)}" fill="${fill}" stroke="${cell.fill || cell.hot ? edge : 'none'}" stroke-width="${p.strokeWidth}"/>`;
      }
    }
    return frame(p, out);
  },
});
