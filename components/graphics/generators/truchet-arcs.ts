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
  TAU,
  withAlpha,
  wobble,
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
        const show = chance(rng, 0.82);
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
    const h = size / 2;
    let out = '';
    for (const tile of tiles) {
      // Hidden tiles still emit, at zero opacity, so the mark count is constant
      // across the loop and across densities. Dropping them instead would make
      // the emitted-number count depend on the sample, which is exactly what the
      // confetti test watches for.
      const stroke = !tile.show ? 'none' : tile.hot ? bright : faint;
      const k = cycles(tile.roll, 2);
      const phase = (tile.x + tile.y) * 0.008 + tile.roll * TAU;
      const rot = r2(tile.flip * 90 + 90 * wobble(t, k, phase));
      const cx = tile.x + h;
      const cy = tile.y + h;
      // Two quarter-arcs on opposite corners — the Truchet unit.
      const d =
        `M${r2(tile.x)} ${r2(cy)} A${r2(h)} ${r2(h)} 0 0 1 ${r2(cx)} ${r2(tile.y)} ` +
        `M${r2(cx)} ${r2(tile.y + size)} A${r2(h)} ${r2(h)} 0 0 1 ${r2(tile.x + size)} ${r2(cy)}`;
      out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (tile.hot ? 2.4 : 1.2))}" transform="rotate(${rot} ${r2(cx)} ${r2(cy)})" stroke-linecap="butt"/>`;
    }
    return frame(p, out);
  },
});
