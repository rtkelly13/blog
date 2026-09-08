import { defineGenerator } from '../types';
import { frame, ink, lerp, r2 } from './shared';
import { bandPos, flipStep, type Tile, truchetTiles } from './truchet-arcs';

/* ── truchet-mirror ───────────────────────────────────────────────────────── */

/**
 * A Truchet whose tiles alternate handedness, so arcs meet as lenses rather
 * than carrying through.
 *
 * ## Why the mirror is the sweep flag and not a rotation
 *
 * The obvious way to "mirror half the tiles" is to give the odd cells the other
 * diagonal — and it does nothing at all. A two-arc Truchet tile is symmetric
 * enough that reflecting it *is* rotating it by ninety degrees, so a
 * checkerboard of reflections is indistinguishable from a checkerboard of
 * quarter-turns, which is indistinguishable from the parent's random flips. The
 * pattern stays a set of curves carrying smoothly across every edge, and the
 * mirroring is invisible because there is nothing for it to break.
 *
 * What actually mirrors a quarter-arc is reflecting it **about its own chord**:
 * same two endpoints on the same two cell edges, curving the other way. In SVG
 * that is one character — the arc's sweep flag — and it changes everything the
 * eye cares about, because continuity across an edge is about *tangents*, not
 * about endpoints. Two tiles of the same handedness meet tangentially and the
 * curve carries on. Two of opposite handedness meet at the same point with
 * opposite curvature: a cusp, and between the pair a pointed lens. Do that on a
 * checkerboard and every join in the frame is a cusp, so the long meanders the
 * parent is made of cannot form at all. What forms instead is a field of
 * butterflies — two wings per shared corner, one from each neighbour.
 *
 * The nest is kept, and this is where it pays best. Concentric arcs give
 * concentric lenses, so a wing is a set of nested outlines rather than a single
 * closed curve, which is what makes the shape read as a form with a grain
 * rather than as a blob. Three rings and not the parent's four: a lens is
 * narrowest at its tips, and a fourth ring closes the tips into a solid.
 *
 * Everything else is the parent's mechanism unchanged — quantised orientations
 * so the arcs still land on their neighbours' endpoints, and one narrow band of
 * flips travelling across the grid. The butterflies therefore make and unmake
 * themselves as the band passes, which is a more visible event than the
 * parent's re-routing: a wing either exists or it does not.
 */

/** See the note above — a fourth ring closes the lens tips into a solid. */
const MIRROR_RINGS = 3;

/**
 * Cell size. Larger than the parent's, because a butterfly is a two-cell figure
 * and needs to be legible as one shape rather than as a texture.
 */
const cellSize = (density: number): number => lerp(170, 72, density);

export default defineGenerator<Tile[]>({
  name: 'truchet-mirror',
  label: 'Truchet Mirror',
  description:
    'Mirrored tiles, so arcs meet as butterflies rather than carrying straight through.',
  group: 'lattice',
  sketch: true,
  // A shade slower than the parent: the sweep here makes and unmakes whole
  // figures, and a wing appearing wants longer on screen than a curve
  // re-routing does.
  speed: 0.85,
  defaults: { density: 0.5, strokeWidth: 2 },
  sample: (p) =>
    truchetTiles(p, cellSize(p.density), {
      seedSalt: 1409,
      // Fewer breaks than the parent's one in ten. A butterfly needs *both* of
      // its tiles, so a dropped tile costs two wings, not one arc.
      showChance: 0.94,
      hotChance: 0.06 + p.density * 0.07,
    }),
  project: (tiles, p, t) => {
    const size = cellSize(p.density);
    const span = p.width + p.height;
    let out = '';
    for (const tile of tiles) {
      // The checkerboard, from the grid indices frozen in `sample` — `x`/`y`
      // cannot be used, because `disorder` has already moved them off the
      // lattice and the parity would dissolve exactly where the pattern gets
      // interesting.
      const mirrored = (tile.col + tile.row) % 2;
      // Ramp position: the two handednesses take opposite halves of the ramp,
      // and within a half the band's line of travel fills it out.
      //
      // Parity is the axis this generator is *about* — the whole picture is one
      // class of tile meeting the other — so it deserves the coarse half of the
      // ramp, and it makes the mirroring legible as colour rather than leaving
      // it to be inferred from curvature at a cusp. Colouring by the travel
      // axis alone (as the parent does) would give both wings of every
      // butterfly the same hue and say nothing about the structure; parity
      // alone would flatten the frame to two flat colours. Halving the ramp
      // gives both readings at once.
      const pos = (mirrored + bandPos(tile, span)) / 2;
      const stroke = !tile.show ? 'none' : ink(p, pos, tile.hot ? 0.95 : 0.4);
      const rot = r2(tile.flip * 90 + 90 * flipStep(tile, t, span));
      const cx = tile.x + size / 2;
      const cy = tile.y + size / 2;
      // Reflected about the chord: same endpoints, opposite curvature.
      const sweep = mirrored ? 0 : 1;
      let d = '';
      for (let ring = 0; ring < MIRROR_RINGS; ring++) {
        const rad =
          size * (0.22 + (0.62 * ring) / Math.max(1, MIRROR_RINGS - 1));
        d +=
          `M${r2(tile.x)} ${r2(tile.y + rad)} A${r2(rad)} ${r2(rad)} 0 0 ${sweep} ${r2(tile.x + rad)} ${r2(tile.y)} ` +
          `M${r2(tile.x + size - rad)} ${r2(tile.y + size)} A${r2(rad)} ${r2(rad)} 0 0 ${sweep} ${r2(tile.x + size)} ${r2(tile.y + size - rad)} `;
      }
      d = d.trim();
      out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (tile.hot ? 1.7 : 0.85))}" transform="rotate(${rot} ${r2(cx)} ${r2(cy)})" stroke-linecap="butt"/>`;
    }
    return frame(p, out);
  },
});
