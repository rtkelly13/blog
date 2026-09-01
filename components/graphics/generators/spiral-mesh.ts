import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  centre,
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

/* ── spiral-mesh ──────────────────────────────────────────────────────────── */

interface SpiralMesh {
  /** Spiral arms out from the centre, and vertices along each one. */
  arms: number;
  steps: number;
  /**
   * Radial nudge per vertex, indexed `arm * steps + step`.
   *
   * Sampled rather than derived so the mesh has a texture of its own, and flat
   * rather than nested so the rng is consumed in one predictable sweep.
   */
  jitter: number[];
  /** Radians an arm turns between its innermost and outermost vertex. */
  twist: number;
  /** How much that twist winds and unwinds over the loop, and how often. */
  twistSwing: number;
  twistCycles: number;
  /** Whole turns of the whole figure per loop. */
  spin: number;
}

/**
 * Where a vertex sits along its arm, as a power of its index.
 *
 * Below 1 the vertices bunch up toward the rim, above 1 toward the centre.
 * Slightly below, because the arms converge on the centre anyway and crowding
 * them further there wastes vertices on a knot nobody can resolve.
 */
const RADIAL_POWER = 0.88;

/** Vertices following spiral trajectories, joined along and across the arms. */
export default defineGenerator<SpiralMesh>({
  name: 'spiral-mesh',
  label: 'Spiral Mesh',
  description: 'A mesh following spiral trajectories, for circular flow.',
  group: 'radial',
  sketch: true,
  // Slower than the lattice generators, and the reason is geometric: a turn
  // at full reach covers the whole circumference, so what reads as a stately
  // rotation on a small form is a blur on a frame-filling one. See
  // `GeneratorModule.speed`.
  speed: 0.5,
  defaults: { density: 0.5, strokeWidth: 2 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // As everywhere in this family, a vertex costs two emissions — one in its
    // arm, one in the cross-link ring at its own radius — so these ceilings are
    // set by the data-URI budget rather than by taste.
    const arms = Math.round(lerp(14, 26, p.density));
    const steps = Math.round(lerp(16, 26, p.density));
    const jitter: number[] = [];
    for (let i = 0; i < arms * steps; i++) jitter.push(range(rng, -1, 1));
    const twistRoll = rng();
    const spinRoll = rng();
    return {
      jitter,
      arms,
      steps,
      twist: lerp(1.6, 3.4, twistRoll),
      twistSwing: lerp(0.5, 1.1, spinRoll),
      // Integers, or the arms are caught mid-wind at `t = 1`.
      twistCycles: cycles(twistRoll, 2),
      spin: cycles(spinRoll, 2),
    };
  },

  /**
   * ## What the two families of line are
   *
   * Along an arm: the spiral trajectory itself, one polyline per arm. Across
   * them: a ring through the vertex at the same index on every arm, which is a
   * closed polygon rather than a circle because the arms are not evenly
   * displaced. Neither family alone reads as a mesh — the arms alone are a
   * pinwheel, the rings alone are a stack of rosettes — and it is the crossing
   * that makes a surface out of them.
   *
   * ## Why the cross-links need no code of their own
   *
   * They are indexed by *step*, not by position, so a ring is simply "the same
   * vertex on each arm" and follows whatever the arms do. Wind the spiral up
   * and the rings shear round with it; rotate the figure and they rotate. That
   * is the reason the layout runs before the emission rather than each family
   * computing its own vertices: two derivations of the same point can disagree,
   * one cannot.
   *
   * ## Winding, on top of turning
   *
   * A rigid rotation is the only rotation that closes the loop exactly (see the
   * note in `polar-mesh`), and on its own it reads as a turntable. Modulating
   * the *twist* through `wobble` — zero at both ends of the loop by
   * construction — makes the arms wind and unwind as they turn, so the figure
   * is deforming rather than merely spinning, and the cross-links stretch and
   * relax with it.
   */
  project: (m, p, t) => {
    const [cx, cy] = centre(p);
    // Past the corners: the outermost ring should leave the frame rather than
    // sit inside it as a visible boundary.
    const maxR = Math.hypot(p.width, p.height) * 0.46;
    const twistNow = m.twist + m.twistSwing * wobble(t, m.twistCycles, 0.6);
    const spinNow = t * TAU * m.spin;

    const xs: number[][] = []; // [arm][step]
    const ys: number[][] = [];
    for (let a = 0; a < m.arms; a++) {
      const base = (a / m.arms) * TAU + spinNow;
      const rx: number[] = [];
      const ry: number[] = [];
      for (let k = 0; k < m.steps; k++) {
        const u = (k + 1) / m.steps;
        const r = maxR * u ** RADIAL_POWER;
        // The jitter is radial only. Nudging the angle too would let an arm
        // cross its neighbour, and a mesh whose quads overlap stops reading as
        // a surface.
        const th = base + twistNow * u;
        const rr = r + m.jitter[a * m.steps + k] * (maxR / m.steps) * 0.45;
        rx.push(cx + rr * Math.cos(th));
        ry.push(cy + rr * Math.sin(th));
      }
      xs.push(rx);
      ys.push(ry);
    }

    let out = '';
    // Cross-links first, arms over them — the arms are the structure the eye
    // should follow, and the rings are what tells it there is a surface there.
    for (let k = 0; k < m.steps; k++) {
      // Position on the ramp is normalised radius: a cross-link ring is the
      // set of vertices at one step index, and step index *is* radius here (up
      // to `RADIAL_POWER`). The rings already fade and thin outward, so hue
      // joins the cues that are all saying the same thing.
      const depth = m.steps === 1 ? 0 : k / (m.steps - 1);
      let d = '';
      for (let a = 0; a < m.arms; a++) {
        d += `${a === 0 ? 'M' : 'L'}${r2(xs[a][k])} ${r2(ys[a][k])} `;
      }
      out += `<path d="${d.trim()} Z" fill="none" stroke="${ink(p, depth, r2(lerp(0.5, 0.12, depth)))}" stroke-width="${r2(p.strokeWidth * lerp(0.55, 0.3, depth))}" stroke-linejoin="round"/>`;
    }
    for (let a = 0; a < m.arms; a++) {
      // From the centre, so the arms converge rather than starting at a ragged
      // inner ring.
      let d = `M${r2(cx)} ${r2(cy)} `;
      for (let k = 0; k < m.steps; k++)
        d += `L${r2(xs[a][k])} ${r2(ys[a][k])} `;
      // An arm runs the whole radius, so like `polar-mesh`'s spokes it has no
      // radius of its own and takes the middle of the ramp.
      out += `<path d="${d.trim()}" fill="none" stroke="${ink(p, 0.5, 0.55)}" stroke-width="${r2(p.strokeWidth * 0.6)}" stroke-linejoin="round"/>`;
    }
    return frame(p, out);
  },
});
