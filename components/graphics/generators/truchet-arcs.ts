import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  disorderAt,
  frame,
  intRange,
  lerp,
  mulberry32,
  r2,
  scramble,
  withAlpha,
} from './shared';

/* ── truchet-arcs ─────────────────────────────────────────────────────────── */

interface Tile {
  x: number;
  y: number;
  /** 0 or 1 — which diagonal the pair of quarter-arcs connects. */
  flip: number;
  hot: boolean;
  show: boolean;
  roll: number;
}

/**
 * Quarter-arc Truchet tiling.
 *
 * A Truchet tile has no orientation of its own; the pattern is entirely in how
 * neighbours agree. That makes it the one tiling whose *motion* can be about
 * connection rather than displacement — as tiles turn, arcs meet across edges
 * and long curves form and break across the whole frame. Nothing else here does
 * that, because everything else moves marks that were already unrelated.
 *
 * The tiles rock rather than spin, for the reason `scatter-blocks` sets out: a
 * printed `rotate()` of `360` is textually different from `0` while being the
 * same picture. A ±90° rock sweeps through every connection state anyway, which
 * is the part worth seeing.
 */

/**
 * Half-width of the flip band, as a fraction of the loop.
 *
 * Narrow enough that the frame is mostly settled into connected curves, wide
 * enough that the turn eases rather than snaps.
 */
const FLIP_BAND = 0.11;

/**
 * Arcs nested at each corner. Four reads as a ribbon; one reads as texture, and
 * more than five closes the gaps between neighbouring bands into a solid.
 */
const ARC_RINGS = 4;

export default defineGenerator<Tile[]>({
  name: 'truchet-arcs',
  label: 'Truchet Arcs',
  description:
    'Quarter-arc tiles that turn — long curves form and break across the frame.',
  group: 'lattice',
  defaults: { density: 0.5, strokeWidth: 2 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const size = lerp(120, 46, p.density);
    const tiles: Tile[] = [];
    for (let y = 0; y < p.height + size; y += size) {
      for (let x = 0; x < p.width + size; x += size) {
        const flip = intRange(rng, 0, 1);
        const hot = chance(rng, 0.07 + p.density * 0.08);
        // `quarter_circles_grid` leaves tiles out at random, which is what stops
        // a Truchet reading as wallpaper — the breaks are what make the surviving
        // curves legible as paths.
        const show = chance(rng, 0.9);
        // Truchet is the tiling that suffers most from this and gains most:
        // arcs only connect while the tiles line up, so the ramp reads as the
        // pattern's continuity failing rather than as marks moving.
        const chaos = disorderAt(p, y);
        tiles.push({
          x: x + chaos * size * 0.45 * scramble(x, y, 5),
          y: y + chaos * size * 0.45 * scramble(x, y, 6),
          flip,
          hot,
          show,
          roll: rng(),
        });
      }
    }
    return tiles;
  },
  project: (tiles, p, t) => {
    const size = lerp(120, 46, p.density);
    const faint = withAlpha(p.accent, 0.38);
    const bright = withAlpha(p.accent, 0.95);
    let out = '';
    for (const tile of tiles) {
      // Hidden tiles still emit, at zero opacity, so the mark count is constant
      // across the loop and across densities. Dropping them instead would make
      // the emitted-number count depend on the sample, which is exactly what the
      // confetti test watches for.
      const stroke = !tile.show ? 'none' : tile.hot ? bright : faint;
      // Quantised orientations, with a narrow band of flips sweeping through.
      //
      // A Truchet tile has no picture of its own. Everything interesting about
      // the tiling is arcs *meeting across edges* to form long meandering
      // curves, and arcs only meet when tiles sit at multiples of 90 degrees —
      // so a tile at 37 degrees is a tile whose neighbours it never joins.
      //
      // Rocking each tile through `wobble` therefore produced a field of
      // disconnected scallops: every cell individually fine, the whole thing
      // inert. Quantising with a per-tile sinusoid was no better, because with
      // phases spread around the circle the tiles are spread across the flip at
      // any given instant — most of them are always mid-turn.
      //
      // So the flip is a *pulse* travelling across the grid instead. A tile is
      // at a quantised state, and therefore connected, for the great majority
      // of the loop; a narrow diagonal band passes over it, turns it a quarter
      // and lets it settle. The long curves are the resting state and the sweep
      // is what rearranges them.
      const span = p.width + p.height;
      const at = ((tile.x + tile.y) / span + tile.roll * 0.12) % 1;
      const head = (t * cycles(tile.roll, 2)) % 1;
      // Wrapped distance to the band, so a tile at 0.99 is near a band at 0.01.
      const gap = Math.abs(at - head);
      const near = Math.min(gap, 1 - gap);
      // Smoothstep in, so the turn eases rather than snapping — the smoothness
      // floor in the coherence suite is measured per step, and a hard edge here
      // would read as a jump even though the picture is continuous.
      const ramp = near < FLIP_BAND ? 1 - near / FLIP_BAND : 0;
      const step = ramp * ramp * (3 - 2 * ramp);
      const rot = r2(tile.flip * 90 + 90 * step);
      const cx = tile.x + size / 2;
      const cy = tile.y + size / 2;
      // Concentric quarter-arcs on opposite corners — a band, not a hairline.
      //
      // One arc per corner is the textbook Truchet unit and it renders as
      // texture: correct, connected, and nothing to look at. A *nest* of arcs
      // sharing a corner turns each connected path into a ribbon several lines
      // wide, and where two ribbons meet at an edge the whole band carries
      // through — every radius meets its counterpart, because the neighbour's
      // arcs are centred on the same shared corner. That is the version of this
      // tiling worth having.
      let d = '';
      for (let ring = 0; ring < ARC_RINGS; ring++) {
        const rad = size * (0.16 + (0.74 * ring) / Math.max(1, ARC_RINGS - 1));
        d +=
          `M${r2(tile.x)} ${r2(tile.y + rad)} A${r2(rad)} ${r2(rad)} 0 0 1 ${r2(tile.x + rad)} ${r2(tile.y)} ` +
          `M${r2(tile.x + size - rad)} ${r2(tile.y + size)} A${r2(rad)} ${r2(rad)} 0 0 1 ${r2(tile.x + size)} ${r2(tile.y + size - rad)} `;
      }
      d = d.trim();
      out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (tile.hot ? 1.5 : 0.75))}" transform="rotate(${rot} ${r2(cx)} ${r2(cy)})" stroke-linecap="butt"/>`;
    }
    return frame(p, out);
  },
});
