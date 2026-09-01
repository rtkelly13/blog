import { defineGenerator } from '../types';
import { frame, ink, lerp, r2 } from './shared';
import { bandPos, flipStep, type Tile, truchetTiles } from './truchet-arcs';

/* ── truchet-single ───────────────────────────────────────────────────────── */

/**
 * The textbook Truchet: one quarter-arc per corner, no nest.
 *
 * The parent argues that a single arc "renders as texture" — correct at the
 * parent's tile size, where a hairline grid of 46px cells is too fine for any
 * one path to be followed. The claim is really about *density*, not about the
 * arc count: take the ribbon away and give the tiles room, and the opposite
 * effect appears. With cells around half again the parent's and only one line
 * to follow, the eye can actually trace a curve for six or eight tiles before
 * it closes on itself, which is the thing a Truchet is famous for and which the
 * ribbon version hides inside a band.
 *
 * So this is not "the parent with `ARC_RINGS = 1`". Three things move together
 * and all three are needed for the sparse reading:
 *
 *  - **radius `size / 2`.** The one radius whose endpoints land on the *edge
 *    midpoints*, which is what makes a curve continue into the neighbour
 *    regardless of which diagonal that neighbour chose. The parent's nest gets
 *    continuity from sharing a corner; a lone arc gets it from the midpoint,
 *    and any other radius is a scallop that stops at the edge.
 *  - **bigger cells.** Fewer, longer paths instead of more, shorter ones.
 *  - **fewer breaks.** The parent drops one tile in ten to keep a ribbon field
 *    from reading as wallpaper. A single-line field is already open, and a gap
 *    here severs a path the viewer was following, so the drop rate falls to one
 *    in twenty-five: enough to keep the tiling from closing into pure loops,
 *    not enough to shred it.
 *
 * The mechanism is the parent's throughout — quantised orientations and one
 * narrow band of flips travelling across the grid. See `truchet-arcs` for why
 * the turn has to be a travelling pulse rather than a per-tile oscillation.
 */

/**
 * Cell size, against the parent's 120..46.
 *
 * Tuned by looking rather than by argument, and both bounds were found by
 * overshooting. At 210..96 the frame held eight cells across and the arcs read
 * as scalloped cloud edges — a wallpaper motif, not a path anyone follows. Much
 * below the parent's and a single line stops being sparse and goes back to
 * being texture, which is the parent's own point.
 */
const cellSize = (density: number): number => lerp(150, 68, density);

export default defineGenerator<Tile[]>({
  name: 'truchet-single',
  label: 'Truchet Single',
  description:
    'One arc per corner instead of a nest — the classic thin Truchet, all line and no ribbon.',
  group: 'lattice',
  // Longer legible paths want longer to be read, and with a tenth as many
  // strokes on screen the sweep is far more conspicuous than it is in the
  // parent's texture — so the same pulse wants a slower loop.
  speed: 0.7,
  defaults: { density: 0.5, strokeWidth: 2 },
  sample: (p) =>
    truchetTiles(p, cellSize(p.density), {
      // Not a recolour of the parent's layout: the same seed should give a
      // different tiling here, or the two read as one graphic drawn twice.
      seedSalt: 617,
      showChance: 0.96,
      // Slightly rarer than the parent's, because a heavy stroke is far more
      // conspicuous when it is the only line in the cell.
      hotChance: 0.05 + p.density * 0.05,
    }),
  project: (tiles, p, t) => {
    const size = cellSize(p.density);
    const half = size / 2;
    const span = p.width + p.height;
    let out = '';
    for (const tile of tiles) {
      // Emitted even when hidden, with `stroke="none"` — the count of numbers
      // in the document has to be identical at every `t`, and dropping a tile
      // would make it depend on the sample.
      const stroke = !tile.show
        ? 'none'
        : ink(p, bandPos(tile, span), tile.hot ? 0.95 : 0.55);
      const rot = r2(tile.flip * 90 + 90 * flipStep(tile, t, span));
      const cx = tile.x + half;
      const cy = tile.y + half;
      // Two quarter-circles of radius `size / 2`, centred on opposite corners,
      // meeting the cell edges at their midpoints.
      const d =
        `M${r2(tile.x)} ${r2(cy)} A${r2(half)} ${r2(half)} 0 0 1 ${r2(cx)} ${r2(tile.y)} ` +
        `M${r2(cx)} ${r2(tile.y + size)} A${r2(half)} ${r2(half)} 0 0 1 ${r2(tile.x + size)} ${r2(cy)}`;
      // Heavier than the parent's, in both weights, and brighter at the faint
      // end. A ribbon carries its own presence from four stacked lines; a lone
      // arc has to earn it, and at the parent's 0.75x and alpha 0.38 a single
      // curve across a 150px cell is a scratch on the backdrop.
      out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (tile.hot ? 2.2 : 1.1))}" transform="rotate(${rot} ${r2(cx)} ${r2(cy)})" stroke-linecap="round"/>`;
    }
    return frame(p, out);
  },
});
