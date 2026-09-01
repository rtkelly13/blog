import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  centre,
  cycles,
  frame,
  ink,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
} from './shared';

/* ── brockmann-arcs ───────────────────────────────────────────────────────── */

interface ArcCell {
  /** Fraction of its sector the cell fills, so the gaps stay part of the form. */
  fill: number;
  /** Alpha before contrast — the poster's three weights, not a continuum. */
  weight: number;
}

interface ArcBand {
  /** Mid-radius and stroke thickness, both as fractions of reach. */
  r: number;
  thickness: number;
  /** Ramp position: normalised radius, fixed for the whole band. */
  pos: number;
  cells: ArcCell[];
  /** Whole cycles per loop, signed — adjacent bands counter-rotate. */
  spin: number;
  phase: number;
}

/**
 * A handful of very heavy concentric arcs — poster weight, in the
 * Müller-Brockmann sense.
 *
 * ## What makes it not `broken-ring`
 *
 * The sibling is *texture*: eight or nine bands cut into thirty cells each,
 * two thirds of them knocked out, so what you read is the field of small
 * facets and the noise in it. This one is *typographic furniture*. Three to
 * five bands, three or four cells in each, and every cell is a stroke tens of
 * pixels thick — around thirty marks in the whole frame against the sibling's
 * two hundred and fifty. Nothing here is fine enough to read as a texture; each
 * arc is a shape you could name, which is what a Brockmann concert poster does
 * with its segments and what a mesh of small cells cannot.
 *
 * The consequences follow from the count. The cells are true arcs rather than
 * the sibling's polygons — a facetted quadrilateral is invisible at cell size
 * and blatant at this one, where a straight chord where a curve should be is
 * the only thing you would see. And nothing is knocked out: with four cells to
 * a band, a missing one is a hole rather than negative space. The rhythm comes
 * from the gaps between cells and from three flat weights, not from absence.
 *
 * ## Motion
 *
 * Bands counter-rotate a whole turn per loop on their own phases, which at this
 * weight is the point — the arcs are big enough that the eye tracks individual
 * ends, and two neighbouring bands turning opposite ways make the gap between
 * them scissor. Rotation is consumed by `cos`/`sin` rather than printed as a
 * `rotate()`, because a printed whole turn emits `360` against `0`: the same
 * picture, a different string, and a failed loop-closure test.
 */

/** Fractions of reach the innermost and outermost band centres sit at. */
const ARC_INNER = 0.3;
const ARC_OUTER = 1.02;

/**
 * Share of a band's slot taken up by its stroke. Below about 0.5 the bands stop
 * reading as a set and become unrelated rings; at 1 they touch and the negative
 * space between them — half of what makes this a poster — disappears.
 */
const ARC_WEIGHT = 0.66;

export default defineGenerator<ArcBand[]>({
  name: 'brockmann-arcs',
  label: 'Brockmann Arcs',
  description:
    'A handful of very thick concentric arc segments — poster weight, not fine structure.',
  group: 'radial',
  // Radial generators must slow themselves down: tangential speed is `ω · r`,
  // and one turn per loop at full reach is already brisk. Slower than the
  // sibling again, because a mark this large makes its own speed obvious.
  speed: 0.45,
  defaults: { density: 0.5, strokeWidth: 2 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Deliberately a narrow range. `density` cannot be allowed to turn this
    // into the sibling: four bands of four is the look, and five bands of four
    // is as busy as it is allowed to get.
    const bands = Math.round(lerp(3, 5, p.density));
    const slot = (ARC_OUTER - ARC_INNER) / Math.max(1, bands);
    const out: ArcBand[] = [];
    for (let i = 0; i < bands; i++) {
      const r = ARC_INNER + (i + 0.5) * slot;
      // Three or four cells, drawn per band so the bands do not share a rhythm
      // — the offbeat between a band of three and a band of four is most of
      // what stops a small set of arcs looking like a loading spinner.
      const count = intRange(rng, 3, 4);
      const cells = Array.from({ length: count }, () => ({
        // A cell leaves between a sixth and a third of its sector empty, so
        // the gaps are wide enough to be seen as gaps at this stroke weight.
        fill: range(rng, 0.66, 0.84),
        // Three flat weights rather than a continuum. A poster's hierarchy is
        // stepped, and interpolated alphas read as a gradient — the thing this
        // generator is explicitly not.
        weight: rng() < 0.28 ? 0.95 : rng() < 0.5 ? 0.55 : 0.24,
      }));
      out.push({
        r,
        thickness: slot * ARC_WEIGHT,
        pos: (r - ARC_INNER) / (ARC_OUTER - ARC_INNER),
        cells,
        // One turn per loop, never two: `cycles(v, 2)` would sometimes return
        // 2, and at this reach that doubles the rim speed to the blur the
        // radial family's `speed` exists to avoid. Signed, so neighbours
        // counter-rotate and the gaps scissor.
        spin: cycles(rng(), 1) * (i % 2 ? -1 : 1),
        phase: range(rng, 0, TAU),
      });
    }
    return out;
  },
  project: (bands, p, t) => {
    // `centre()`, not the frame centre: this is the radial family's whole
    // reason for existing — the arcs should be able to wrap a title sitting
    // anywhere in the frame. The default origin is (0.5, 0.5), so nothing
    // moves unless someone asks it to.
    const [cx, cy] = centre(p);
    const reach = Math.min(p.width, p.height) * 0.62;
    let out = '';
    for (const band of bands) {
      const n = band.cells.length;
      const step = TAU / n;
      const spin = band.phase + t * TAU * band.spin;
      const r = band.r * reach;
      // Ramp position is **normalised radius**, the axis a radial form is
      // already about, and one position for the whole band because a band is
      // one radius. At poster weight this is the most visible use of the ramp
      // anywhere in the set: four arcs, four flat colours stepping outward.
      const stroke = (a: number) => ink(p, band.pos, a);
      for (let i = 0; i < n; i++) {
        const cell = band.cells[i];
        const a0 = spin + i * step;
        const sweep = step * cell.fill;
        const a1 = a0 + sweep;
        // The arc flag is a sampled constant, not a per-frame decision: a flag
        // that flipped mid-loop would change the picture discontinuously while
        // every coordinate stayed smooth.
        const large = sweep > Math.PI ? 1 : 0;
        const x0 = r2(cx + Math.cos(a0) * r);
        const y0 = r2(cy + Math.sin(a0) * r);
        const x1 = r2(cx + Math.cos(a1) * r);
        const y1 = r2(cy + Math.sin(a1) * r);
        out += `<path d="M${x0} ${y0} A${r2(r)} ${r2(r)} 0 ${large} 1 ${x1} ${y1}" fill="none" stroke="${stroke(cell.weight)}" stroke-width="${r2(band.thickness * reach)}" stroke-linecap="butt"/>`;
      }
    }
    return frame(p, out);
  },
});
