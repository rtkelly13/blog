import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  ink,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  wobble,
} from './shared';

/* ── iso-cubes ────────────────────────────────────────────────────────────── */

interface Cube {
  col: number;
  row: number;
  /** Sampled height in cube units — the still silhouette. */
  height: number;
  /**
   * The same height mapped to 0..1 — where this column sits on the colour ramp.
   *
   * Precomputed here rather than in `project` because it depends on the
   * sampling range, and because a height field coloured *by height* is the
   * whole reason this generator has an obvious position axis: the ramp reads as
   * a contour scale over the landscape, low columns at one end and towers at
   * the other. Every other candidate — depth into the scene, distance from the
   * origin — would be a gradient laid *over* the form rather than one the form
   * already has.
   */
  pos: number;
  lit: boolean;
  phase: number;
}

/**
 * Isometric cubes on a height field — the generator `occlusion` exists for.
 *
 * `iso-grid` draws diamonds because flat diamonds never overlap. The moment
 * cubes stack, a nearer cube has to hide the one behind it, and there is no way
 * to say that with an accent and an alpha: `withAlpha(accent, 0.9)` still lets
 * the far cube through, and the stack turns to soup exactly where the depth cue
 * was supposed to be. So the faces are painted `p.occlusion` — opaque, matching
 * the surface — and the form is carried by the stroked edges over the top.
 *
 * That is the technique the isometric patterns in the reference set use, and
 * measurably so: they are the only ten of the fifty-seven that declare an
 * occlusion colour at all.
 *
 * Draw order is back-to-front by `row + col`, which is the whole of painter's
 * algorithm on a regular lattice and the reason the occlusion reads correctly.
 */

/**
 * Sampled height range, in cube units, and the ends of the colour ramp.
 *
 * Named rather than inlined because two things now depend on them agreeing: the
 * `range()` draw, and the normalisation that turns a height into a ramp
 * position. Drifting them apart would silently compress the gradient into part
 * of the ramp.
 */
const HEIGHT_MIN = 0.15;
const HEIGHT_MAX = 1;

/**
 * The isometric cell geometry, derived from density.
 *
 * Exported because the isometric variants (`iso-terrain`, `iso-blocks`) are the
 * same projection with a different height field, and a variant that re-derived
 * these by eye would sit on a subtly different lattice for no reason.
 */
export interface IsoCell {
  /** Half the width of a cube's diamond footprint. */
  halfW: number;
  /** Half its height — the isometric foreshortening, ~0.58 of the width. */
  halfH: number;
  /** Screen height of one cube unit. */
  unit: number;
}

export const isoCell = (cellWidth: number): IsoCell => ({
  halfW: cellWidth / 2,
  halfH: cellWidth * 0.29,
  unit: cellWidth * 0.62,
});

/**
 * One cube: two opaque side faces, a cap, and the edges over the top.
 *
 * The five elements are emitted in a fixed order for a fixed cube, which is
 * what keeps the emitted-number count constant across the loop. `bx`/`by` is
 * the front corner of the footprint and `hgt` the column height in pixels.
 *
 * Shared with the variants so the occlusion contract — faces painted with
 * `p.occlusion`, never with an alpha — is stated once. An alpha here lets the
 * cube behind show through and the stack turns to soup exactly where the depth
 * cue was meant to be.
 */
export function isoCube(
  cell: IsoCell,
  bx: number,
  by: number,
  hgt: number,
  occlusion: string,
  cap: string,
  edge: string,
  strokeWidth: number,
): string {
  const { halfW, halfH } = cell;
  const capY = by - hgt;
  const left = `${r2(bx - halfW)},${r2(by - halfH)} ${r2(bx)},${r2(by)} ${r2(bx)},${r2(capY)} ${r2(bx - halfW)},${r2(capY - halfH)}`;
  const right = `${r2(bx + halfW)},${r2(by - halfH)} ${r2(bx)},${r2(by)} ${r2(bx)},${r2(capY)} ${r2(bx + halfW)},${r2(capY - halfH)}`;
  const top = `${r2(bx)},${r2(capY)} ${r2(bx + halfW)},${r2(capY - halfH)} ${r2(bx)},${r2(capY - halfH * 2)} ${r2(bx - halfW)},${r2(capY - halfH)}`;
  return (
    `<polygon points="${left}" fill="${occlusion}"/>` +
    `<polygon points="${right}" fill="${occlusion}"/>` +
    `<polygon points="${top}" fill="${cap}"/>` +
    `<path d="M${r2(bx - halfW)} ${r2(capY - halfH)} L${r2(bx)} ${r2(capY)} L${r2(bx + halfW)} ${r2(capY - halfH)} M${r2(bx)} ${r2(capY)} L${r2(bx)} ${r2(by)}" fill="none" stroke="${edge}" stroke-width="${strokeWidth}"/>` +
    `<polygon points="${top}" fill="none" stroke="${edge}" stroke-width="${strokeWidth}"/>`
  );
}

export default defineGenerator<Cube[]>({
  name: 'iso-cubes',
  label: 'Iso Cubes',
  description:
    'Stacked cubes on a rolling height field — opaque faces, so depth survives.',
  group: 'isometric',
  defaults: { density: 0.4, strokeWidth: 1.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Five polygons per cube — see the element budget note in `iso-terrain`.
    const cols = Math.round(lerp(7, 12, p.density));
    const rows = Math.round(lerp(9, 15, p.density));
    const cubes: Cube[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Drawn before `pos` is derived from it, so the rng stream stays in
        // lattice order — deriving rather than drawing is what keeps the ramp
        // free of any effect on the composition.
        const height = range(rng, 0.15, 1);
        cubes.push({
          col,
          row,
          height,
          pos: (height - HEIGHT_MIN) / (HEIGHT_MAX - HEIGHT_MIN),
          lit: chance(rng, 0.14),
          phase: range(rng, 0, TAU),
        });
      }
    }
    // Painter's order. Sorted after sampling so the rng stream stays in lattice
    // order and does not depend on the comparator.
    return cubes.sort((a, b) => a.row + a.col - (b.row + b.col));
  },
  project: (cubes, p, t) => {
    const cell = isoCell(lerp(74, 38, p.density));
    const { halfW, halfH, unit } = cell;
    const originX = p.width / 2;
    const originY = p.height * 0.16;
    let out = '';
    for (const c of cubes) {
      // Edges and cap take their hue from the column's height. With a single
      // accent `ink` is exactly the `withAlpha(p.accent, …)` these three
      // constants used to be — byte for byte, which is why this could be done
      // under a golden — and with a ramp the silhouette gains a second reading
      // of the same height it already draws.
      const edge = ink(p, c.pos, 0.55);
      const top = ink(p, c.pos, c.lit ? 0.9 : 0.16);
      // A travelling wave over the lattice rather than a per-cube bob: the
      // surface rises and falls as a landscape, which is the thing a height
      // field can do that a grid of independent pulses cannot.
      const lift =
        1 +
        0.45 * wobble(t, cycles(c.height, 2), c.phase + (c.col - c.row) * 0.5);
      const hgt = c.height * unit * lift;
      const bx = originX + (c.col - c.row) * halfW;
      const by = originY + (c.col + c.row) * halfH;
      // Faces opaque — see `isoCube`, which the variants share.
      out += isoCube(cell, bx, by, hgt, p.occlusion, top, edge, p.strokeWidth);
    }
    return frame(p, out);
  },
});
