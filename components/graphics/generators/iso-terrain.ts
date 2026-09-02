import { defineGenerator } from '../types';
import { type IsoCell, isoCell, isoCube } from './iso-cubes';
import type { Rng } from './shared';
import {
  frame,
  ink,
  intRange,
  lerp,
  mix,
  mulberry32,
  r2,
  range,
  solidInk,
  TAU,
  valueNoise,
} from './shared';

/* ── iso-terrain ──────────────────────────────────────────────────────────── */

interface Column {
  col: number;
  row: number;
  /** Where in noise space this column stands. Fixed; only the field moves. */
  nx: number;
  ny: number;
  /**
   * Elevation at rest — the tint of this column's cliff faces for the whole
   * loop, and the one quantity here that must not follow the animation.
   *
   * Faces are opaque, so their colour is a `mix()` of two hexes rather than an
   * `rgba()`, and a hex is where the coherence suite's mark-count invariant
   * bites: it compares *every number in the document by index*, and `#0a2b3c`
   * yields three numbers where `#0a2bdf` yields two. A face tint recomputed from
   * the live elevation therefore changes how many numbers the frame emits, which
   * reads as marks appearing and disappearing. Alphas are safe — `rgba(...)`
   * always has exactly four — which is why the cap and the edges can light up
   * with the terrain and the faces cannot.
   */
  rest: number;
}

interface Terrain {
  columns: Column[];
  cols: number;
  rows: number;
  /** Which patch of noise space this seed's landscape is cut from. */
  seed: number;
  /** How many whole circuits of the noise circle the loop makes. */
  turns: number;
}

/**
 * `iso-cubes` with the height field replaced by noise, which is the whole
 * difference between a skyline and a landscape.
 *
 * The parent draws each column's height from the rng independently. That is a
 * *random* height field, not a *coherent* one: neighbouring columns are
 * uncorrelated, so there are no slopes, no ridges and no basins — every column
 * is a surprise, and the eye reads a bar chart of noise rather than ground.
 * Sampling one smooth 2D noise field at the lattice positions instead makes
 * neighbours agree, and agreement is all terrain is. The identical projection,
 * the identical cube, the identical painter's order; only where the numbers
 * come from changes, and the picture stops being a city and becomes a valley.
 *
 * ## Why the field travels on a circle
 *
 * Value noise is not periodic, so animating it by walking a straight line
 * through noise space never returns to where it began and the loop cannot
 * close. Walking a **circle** does, exactly, while the terrain crossed along
 * the way is still aperiodic — `ridgeline` has the long version of this
 * argument, and it is the same one.
 *
 * The circle is walked in the *offset* applied to every column at once, so the
 * whole landscape drifts through the lattice as one body: hills rise on one
 * side and sink on the other, the way ground does when the camera moves over
 * it. Offsetting each column independently would give the same height range and
 * read as a boiling mess.
 *
 * ## Two octaves, and no more
 *
 * One octave is smooth hills with nothing on them. Two adds the foothill scale
 * that makes a slope legible against the isometric grid. A third would be
 * finer than the lattice pitch, and detail below the sampling rate does not
 * appear — it aliases, which here means neighbouring columns disagreeing again,
 * which is the exact failure the noise was brought in to fix.
 */

/**
 * Lattice pitch in noise space — how much terrain one cube covers.
 *
 * The knob that trades relief against coherence. Larger means more hills across
 * the frame and steeper ground; past about 0.5 adjacent columns stop agreeing
 * and it degenerates back into the parent's skyline.
 */
const FEATURE = 0.4;

/**
 * Radius of the circle walked through noise space over one loop.
 *
 * In the same units as {@link FEATURE}, so this is "how much new ground the
 * loop travels over" measured in cubes: 0.9 is a little under three cube widths
 * of drift, enough that a hill visibly crosses the field without the terrain
 * changing so fast that it boils.
 */
const DRIFT_R = 0.9;

/**
 * Height in cube units at the bottom and the top of the noise range.
 *
 * A wider band than the parent draws from, and it has to be: noise clusters
 * around its midpoint, so mapping it onto the parent's range gives a field
 * where almost every column is the same height and the landscape reads as a
 * plateau with a few dents. Stretching the ends puts real relief on it.
 */
const LOW = 0.08;
const HIGH = 1.95;

/** Two octaves of value noise, offset onto the loop's circle. */
function elevation(c: Column, seed: number, ox: number, oy: number): number {
  const a = valueNoise(c.nx + ox, c.ny + oy, seed);
  // The second octave rides the same offset at twice the rate, so it drifts
  // with the first rather than sliding across it.
  const b = valueNoise((c.nx + ox) * 2.1 + 11.3, (c.ny + oy) * 2.1 + 7.7, seed);
  return a * 0.68 + b * 0.32;
}

export default defineGenerator<Terrain>({
  name: 'iso-terrain',
  label: 'Iso Terrain',
  description:
    'Cubes on a noise height field — an isometric landscape rather than a regular stack.',
  group: 'isometric',
  speed: 0.8,
  defaults: { density: 0.5, strokeWidth: 1.5 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cols = Math.round(lerp(9, 18, p.density));
    const rows = Math.round(lerp(11, 22, p.density));
    // Where in noise space this landscape is cut from. Drawn, not derived, so
    // the seed picks a genuinely different valley rather than the same one
    // viewed from a different corner.
    const ox = range(rng, -60, 60);
    const oy = range(rng, -60, 60);
    const seed = intRange(rng, 1, 9999);
    // Whole circuits per loop, so the field is exactly back where it started at
    // `t = 1`. `cycles` cannot return a float, which is what enforces it.
    const turns = intRange(rng, 1, 2);
    const columns: Column[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const column: Column = {
          col,
          row,
          nx: ox + col * FEATURE,
          ny: oy + row * FEATURE,
          rest: 0,
        };
        // The field at `t = 0`, evaluated here rather than in `project` so the
        // face tint is fixed for the loop. Deterministic arithmetic, no rng —
        // `sample` may compute whatever it likes as long as it does not read
        // `t` and does not draw out of turn.
        column.rest = elevation(column, seed, 0, 0);
        columns.push(column);
      }
    }
    // Painter's order, frozen here rather than in `project`. It is by lattice
    // depth and *not* by height, which matters more here than in the parent:
    // heights change every frame, so a height-aware sort would reshuffle the
    // document mid-loop and every reordered cube would read as a teleport. On a
    // regular lattice `row + col` is correct regardless of height anyway — a
    // nearer column is always in front, however short it is.
    return {
      columns: columns.sort((a, b) => a.row + a.col - (b.row + b.col)),
      cols,
      rows,
      seed,
      turns,
    };
  },

  project: (terrain, p, t) => {
    const cell: IsoCell = isoCell(lerp(78, 42, p.density));
    const { halfW, halfH, unit } = cell;
    // The whole field's position on its circle at this instant. One offset for
    // every column, which is what makes the ground move as one body.
    const ang = t * TAU * terrain.turns;
    const ox = DRIFT_R * Math.cos(ang) - DRIFT_R;
    const oy = DRIFT_R * Math.sin(ang);
    const originX = p.width / 2;
    const originY = p.height * 0.2;
    let out = '';
    for (const c of terrain.columns) {
      const n = elevation(c, terrain.seed, ox, oy);
      const hgt = lerp(LOW, HIGH, n) * unit;
      const bx = originX + (c.col - c.row) * halfW;
      const by = originY + (c.col + c.row) * halfH;
      // Colour by *live* elevation, so the ramp is a contour scale the terrain
      // moves through: a hill crossing the frame lights up as it rises and goes
      // out as it sinks. This is the one place a variant deliberately lets the
      // ramp position change with `t` — the position is elevation, elevation is
      // what is animated, and freezing it would leave the colour describing a
      // landscape that has since moved away.
      const edge = ink(p, n, r2(0.3 + 0.4 * n));
      // Squared, so only the peaks catch the light. Linear looked like a
      // uniform wash and lost the ridges entirely.
      const cap = ink(p, n, r2(0.12 + 0.72 * n * n));
      // Cliff faces, opaque but tinted by the column's *rest* elevation, so a
      // hillside is a lit surface rather than a hole cut in the picture. Opaque
      // is not optional — this is the generator `occlusion` exists for, and an
      // alpha here lets the valley floor show through the ridge in front of it.
      // Rest rather than live elevation for the reason given on `Column.rest`.
      const face = mix(p.occlusion, solidInk(p, c.rest), 0.04 + 0.11 * c.rest);
      out += isoCube(cell, bx, by, hgt, face, cap, edge, p.strokeWidth);
    }
    return frame(p, out);
  },
});
