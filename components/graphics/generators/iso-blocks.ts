import { defineGenerator } from '../types';
import { type IsoCell, isoCell, isoCube } from './iso-cubes';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  ink,
  lerp,
  mix,
  mulberry32,
  r2,
  range,
  solidInk,
  TAU,
  wobble,
} from './shared';

/* ── iso-blocks ───────────────────────────────────────────────────────────── */

interface Block {
  col: number;
  row: number;
  /** Height in cube units. Deliberately a narrow band — see the note below. */
  height: number;
  /**
   * Depth into the scene, 0..1 — the ramp position.
   *
   * Height is the obvious axis for `iso-cubes` and the wrong one here, because
   * this generator's whole premise is that the heights are nearly equal: a ramp
   * driven by them would compress into a few indistinguishable steps and read as
   * a flat wash with a fault in it. Depth is the axis a flat field *does* have,
   * and colouring by it gives the aerial perspective the projection cannot —
   * isometric has no vanishing point and no foreshortening, so distance has to
   * be carried by the palette or not at all.
   */
  pos: number;
  phase: number;
}

/**
 * `iso-cubes` flattened and spaced out: architecture rather than terrain.
 *
 * The parent's two defining choices are heights drawn across the full range and
 * a lattice packed tight enough that the cubes touch. Together those make a
 * *surface* — a continuous stack with no gaps, which is why it reads as ground.
 * Invert both and the same cube becomes a building:
 *
 *  - **Spaced apart.** {@link SPREAD} pushes the lattice past the point where
 *    footprints meet, so every block is an object standing on a plane with
 *    visible ground around it. This is the change that does most of the work;
 *    packed cubes cannot read as separate things however tall they are.
 *  - **Near-even heights.** A narrow band, so the tops line up into a horizontal
 *    band the eye reads as a storey line. Full-range heights on a spaced lattice
 *    look like a bar chart; a narrow band looks like a district.
 *  - **Gaps in the plan.** A sixth of the plots are left empty, which is what
 *    turns a grid of blocks into streets between them. Regular *and* sparse —
 *    an even field with holes reads as planned, where the parent's varied field
 *    reads as grown.
 *
 * The bob is correspondingly quiet: enough travel to satisfy the suite's
 * displacement floor and to keep the field alive, staggered along the lattice
 * diagonal so it passes through as a slow swell rather than each block pulsing
 * on its own. A city that bounced would be a different and much worse idea.
 */

/**
 * Lattice pitch as a multiple of the cube footprint.
 *
 * At 1 this is exactly the parent, and the cubes tile with no gap — the packing
 * that makes a surface. Above about 1.3 the footprints separate; 1.65 leaves
 * roughly two thirds of a block of ground between neighbours, which is enough
 * for the gap to read as a street rather than as a crack.
 */
const SPREAD = 1.65;

/** The narrow height band, in cube units. */
const LOW = 0.74;
const HIGH = 1.02;

/** Fraction of plots left empty, and how much taller a landmark stands. */
const VACANT = 0.16;
const LANDMARK = 0.55;

/**
 * The plan, plus its extent — which `project` needs in order to centre it.
 *
 * The parent can hang its lattice off a fixed origin because its cubes touch and
 * its counts are large enough to fill the frame whatever they are. Spread the
 * same lattice by {@link SPREAD} and it no longer fits: a fixed origin puts the
 * plan a quarter of a frame off to one side, with the near corner running off
 * the bottom. Carrying the counts lets the centring be arithmetic rather than a
 * constant that only holds at one density.
 */
interface Plan {
  blocks: Block[];
  cols: number;
  rows: number;
}

export default defineGenerator<Plan>({
  name: 'iso-blocks',
  label: 'Iso Blocks',
  description:
    'A flat field of cubes at even height, widely spaced — architecture, not terrain.',
  group: 'isometric',
  sketch: true,
  speed: 0.8,
  defaults: { density: 0.5, strokeWidth: 1.5 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Fewer than the parent, because each one occupies `SPREAD²` times the
    // ground. Matching its counts would run the plan off the frame.
    const cols = Math.round(lerp(5, 11, p.density));
    const rows = Math.round(lerp(7, 15, p.density));
    const span = Math.max(1, cols + rows - 2);
    const blocks: Block[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Drawn for every plot, occupied or not, so that leaving a plot empty
        // does not shift the stream and re-roll every block after it. The empty
        // plots are decided in `sample`, so the mark count is fixed for the
        // whole loop — this is not the `fill="none"` case, which is about marks
        // that would otherwise come and go *with `t`*.
        const height = range(rng, LOW, HIGH);
        const landmark = chance(rng, 0.1);
        const phase = range(rng, 0, TAU);
        if (chance(rng, VACANT)) continue;
        blocks.push({
          col,
          row,
          height: height + (landmark ? LANDMARK : 0),
          pos: (col + row) / span,
          phase,
        });
      }
    }
    // Painter's order, frozen before `project` ever runs. Back to front by
    // lattice depth, which is the whole of painter's algorithm on a regular
    // lattice and the reason the opaque faces occlude correctly.
    return {
      blocks: blocks.sort((a, b) => a.row + a.col - (b.row + b.col)),
      cols,
      rows,
    };
  },

  project: (plan, p, t) => {
    const cell: IsoCell = isoCell(lerp(96, 58, p.density));
    const { halfW, halfH, unit } = cell;
    const pitchX = halfW * SPREAD;
    const pitchY = halfH * SPREAD;
    // Centre the plan on its own extent. `col - row` and `col + row` average to
    // these, so subtracting them puts the middle of the lattice in the middle of
    // the frame at any density and any count.
    const originX = p.width / 2 - ((plan.cols - plan.rows) / 2) * pitchX;
    // Below centre, not on it: a block is drawn *up* from its footprint, so a
    // plan centred on its footprints sits visibly high in the frame.
    const originY =
      p.height * 0.56 - ((plan.cols + plan.rows - 2) / 2) * pitchY;
    let out = '';
    for (const b of plan.blocks) {
      // Staggered along the diagonal, so the swell crosses the plan rather than
      // every block breathing in time.
      const lift =
        1 +
        0.26 * wobble(t, cycles(b.height, 2), b.phase + (b.col + b.row) * 0.4);
      const hgt = b.height * unit * lift;
      const bx = originX + (b.col - b.row) * pitchX;
      const by = originY + (b.col + b.row) * pitchY;
      // Near blocks bright, far blocks faint — the aerial perspective the
      // projection itself refuses to provide. With a ramp the two ends of the
      // plan also take the two ends of the palette.
      //
      // `pos` counts *away* from the top of the frame, which in this projection
      // is the far corner: `col + row` grows downward, so the plot nearest the
      // viewer is the one with the largest depth, not the smallest.
      const near = b.pos;
      const edge = ink(p, b.pos, r2(0.28 + 0.42 * near));
      const cap = ink(p, b.pos, r2(0.1 + 0.34 * near));
      // The side faces are the parent's occlusion colour tinted toward the ink —
      // opaque, so a near block still hides the one behind it, but no longer
      // exactly the backdrop. On the packed lattice that distinction does not
      // matter, because a cube's neighbours cover its sides; spaced this far
      // apart every side is visible against the background, and faces painted
      // the background's own colour leave nothing but a cap on a stick. Tinting
      // is the only way to give them body without giving up the occlusion.
      const face = mix(p.occlusion, solidInk(p, b.pos), 0.1 + 0.16 * near);
      out += isoCube(cell, bx, by, hgt, face, cap, edge, p.strokeWidth);
    }
    return frame(p, out);
  },
});
