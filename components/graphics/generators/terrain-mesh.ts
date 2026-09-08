import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
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
  valueNoise,
  wobble,
} from './shared';

/* ── terrain-mesh ─────────────────────────────────────────────────────────── */

interface Terrain {
  /** Vertices across a row, and rows from the horizon to the near edge. */
  cols: number;
  rows: number;
  /** Where in noise space this landscape sits, and which one it is. */
  ox: number;
  oy: number;
  noiseSeed: number;
  /**
   * Frame-widths spanned by one circuit of the noise circle. At least 1, or the
   * frame would contain a whole circuit and the terrain would visibly repeat —
   * see the note above `project`.
   */
  span: number;
  /** Whole circuits per loop. Integer, so `t = 1` lands back on `t = 0`. */
  drift: number;
  /** Per-row phase for the lateral sway, so no two rows flex together. */
  sway: number[];
  swayCycles: number;
}

/**
 * Radius of the circle traced through noise space, per row.
 *
 * Bigger means more distinct terrain across the frame and finer features on
 * screen; this is the knob that trades variety against aliasing. At 0.92 the
 * frame covers about four base features, which is enough for a couple of ridges
 * and a valley — the first pass used 0.55 and rendered a landscape so smooth it
 * read as corduroy.
 */
const NOISE_R = 0.92;

/**
 * How far apart in noise space consecutive rows sit.
 *
 * The number that decides whether this is a landscape or a stack of unrelated
 * profiles. Rows walk *concentric* circles offset by this much, so a small step
 * leaves neighbouring rows strongly correlated and a ridge carries backwards
 * through several of them. Much above 0.5 and each row is its own terrain,
 * which reads as noise no matter how neatly the mesh is drawn.
 */
const ROW_STEP = 0.3;

/** How far a row slides sideways over the loop, in pixels. */
const SWAY_PX = 14;

/** A landscape drawn as a wireframe rather than as a silhouette. */
export default defineGenerator<Terrain>({
  name: 'terrain-mesh',
  label: 'Terrain Mesh',
  description:
    'A wireframe height field — terrain drawn as a grid rather than as a silhouette.',
  group: 'terrain',
  defaults: { density: 0.5, strokeWidth: 2 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Vertex count is the whole cost model here: a mesh emits every vertex
    // twice — once in its row polyline, once in the band that joins it to the
    // row behind — so doubling either figure doubles the file. These ceilings
    // put density 1 at a little over a tenth of the data-URI budget.
    const cols = Math.round(lerp(30, 54, p.density));
    const rows = Math.round(lerp(12, 20, p.density));
    const ox = range(rng, -40, 40);
    const oy = range(rng, -40, 40);
    const noiseSeed = Math.floor(range(rng, 1, 9999));
    const spanRoll = rng();
    const driftRoll = rng();
    const sway: number[] = [];
    for (let j = 0; j < rows; j++) sway.push(range(rng, 0, TAU));
    return {
      cols,
      rows,
      ox,
      oy,
      noiseSeed,
      span: lerp(1, 1.6, spanRoll),
      drift: cycles(driftRoll, 2),
      sway,
      swayCycles: cycles(spanRoll, 2),
    };
  },

  /**
   * ## Why the height field is noise on a circle
   *
   * Same construction as `ridgeline`, and for the same reason: a sum of
   * sinusoids that closes the loop is forced to share a divisor and therefore
   * repeats across the frame, while octaves of noise do not repeat at all and
   * do not close. Walking a *circle* through noise space gets both — the
   * profile is genuinely aperiodic to look at, and exactly periodic in `t`,
   * because a circle returns to where it started.
   *
   * What is new here is the second axis. Each row walks its own circle, offset
   * by `ROW_STEP` in noise space, so the rows are slices through one continuous
   * field rather than a stack of independent ridges — which is the difference
   * between a landscape and a set of unrelated profiles drawn at intervals.
   *
   * ## Why the rows are filled, and drawn back to front
   *
   * A wireframe with no hidden-line removal is a tangle: every vertex behind
   * the ridge in front of it is still on screen, and the eye cannot resolve
   * which surface it is looking at. Painting each row's polyline down to the
   * bottom edge in an opaque `occlusion` fill, back row first, does the removal
   * for free — a near ridge covers everything behind it exactly as a real one
   * would, and the mesh acquires the depth that makes it read as a surface.
   *
   * That fixes the draw order: row, then the band of cross-links reaching
   * forward from it, then the next row's fill over whatever of that band has
   * fallen below the new ridge.
   *
   * ## Perspective without a projection matrix
   *
   * Rows are spaced by a power law rather than evenly, and each is wider than
   * the one behind, which is all the perspective a landscape needs. Contrast
   * carries the rest: far rows are faint, thin and shallow; near ones bright,
   * heavy and deep. Distance flattens, so relief grows toward the viewer.
   */
  project: (m, p, t) => {
    const { cols, rows } = m;
    // Both meshes are laid out first and emitted second. The alternative —
    // computing a vertex inside each of the two paths that use it — costs the
    // noise evaluation twice and, worse, makes it possible for the row and the
    // band to disagree about where a vertex is.
    const xs: number[][] = [];
    const ys: number[][] = [];
    for (let j = 0; j < rows; j++) {
      const depth = rows === 1 ? 1 : j / (rows - 1); // 0 = horizon, 1 = nearest
      // Power law, not a linear ramp: rows bunch up at the horizon and open out
      // toward the viewer, which is what the eye reads as ground receding.
      const baseY = p.height * (0.3 + 0.66 * depth ** 1.55);
      const halfW = p.width * lerp(0.42, 0.72, depth);
      const relief = p.height * lerp(0.07, 0.26, depth);
      const swayNow = SWAY_PX * wobble(t, m.swayCycles, m.sway[j]);
      const rx: number[] = [];
      const ry: number[] = [];
      for (let i = 0; i < cols; i++) {
        const u = cols === 1 ? 0 : i / (cols - 1);
        // Drift is added to the angle, not to the coordinate, so every octave
        // advances together and the landscape translates rather than boils.
        const ang = (u / m.span) * TAU + t * TAU * m.drift;
        const nx = m.ox + NOISE_R * Math.cos(ang);
        const ny = m.oy + NOISE_R * Math.sin(ang) + j * ROW_STEP;
        const h =
          valueNoise(nx, ny, m.noiseSeed) * 0.68 +
          valueNoise(nx * 2, ny * 2, m.noiseSeed + 31) * 0.32;
        rx.push(p.width * 0.5 + (u - 0.5) * 2 * halfW + swayNow);
        ry.push(baseY - h * relief);
      }
      xs.push(rx);
      ys.push(ry);
    }

    let out = '';
    for (let j = 0; j < rows; j++) {
      const depth = rows === 1 ? 1 : j / (rows - 1);
      // Position on the ramp is `depth`, exactly as `ridgeline` uses it and for
      // the same reason: distance is what this generator is about, and it is
      // already carried by weight, relief and alpha. Putting hue on the same
      // axis means the far rows and the near ones differ in every cue at once
      // instead of the colour arguing with the perspective.
      // The band of cross-links reaching forward from the row behind. Emitted
      // as one path of `M`/`L` pairs rather than `cols` separate `<line>`s: the
      // same numbers, a third of the bytes, and one element instead of fifty.
      if (j > 0) {
        let band = '';
        for (let i = 0; i < cols; i++) {
          band += `M${r2(xs[j - 1][i])} ${r2(ys[j - 1][i])} L${r2(xs[j][i])} ${r2(ys[j][i])} `;
        }
        out += `<path d="${band.trim()}" fill="none" stroke="${ink(p, depth, r2(lerp(0.12, 0.42, depth)))}" stroke-width="${r2(p.strokeWidth * 0.35)}"/>`;
      }
      // The row's vertices, written once and used twice: as the mask that hides
      // what is behind, and as the ridge line itself.
      let verts = '';
      for (let i = 0; i < cols; i++)
        verts += `L${r2(xs[j][i])} ${r2(ys[j][i])} `;
      // The mask, and the reason it is a separate path from the ridge.
      //
      // Rows narrow toward the horizon, so a fill that begins and ends at the
      // row's own end vertices leaves the rows behind it showing past its
      // sides — which renders as a stack of sheets of paper with visible
      // corners, not as ground. Extending the fill flat to well past both edges
      // fixes it, and it has to be unstroked or that extension draws a hard
      // horizontal line across the sky.
      const lx = r2(-p.width * 0.2);
      const rx2 = r2(p.width * 1.2);
      out += `<path d="M${lx} ${p.height} L${lx} ${r2(ys[j][0])} ${verts}L${rx2} ${r2(ys[j][cols - 1])} L${rx2} ${p.height} Z" fill="${mix(p.occlusion, solidInk(p, depth), r2(lerp(0.02, 0.12, depth)))}" stroke="none"/>`;
      out += `<path d="M${r2(xs[j][0])} ${r2(ys[j][0])} ${verts.trim()}" fill="none" stroke="${ink(p, depth, r2(lerp(0.2, 0.9, depth)))}" stroke-width="${r2(p.strokeWidth * lerp(0.4, 1.15, depth))}" stroke-linejoin="round"/>`;
    }
    return frame(p, out);
  },
});
