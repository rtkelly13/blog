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
  valueNoise,
  wave,
} from './shared';

/* ── polar-mesh ───────────────────────────────────────────────────────────── */

interface PolarMesh {
  /** Rings out from the centre, and spokes around it. */
  rings: number;
  spokes: number;
  /** Which noise field the radial displacement comes from, and where. */
  noiseSeed: number;
  ox: number;
  oy: number;
  /** Whole turns of the whole mesh per loop. */
  spin: number;
  /** Ripples across the radius, and whole ripple cycles per loop. */
  ripples: number;
  ripplesPerLoop: number;
}

/**
 * How far the noise circle for a ring sits from the noise circle for its
 * neighbour, and how big the circles are.
 *
 * The angular coordinate of a polar lattice is *already* periodic, which is the
 * one thing that makes this generator simpler than `terrain-mesh` rather than
 * harder: see the note above `project`.
 */
const RING_STEP = 0.3;
const NOISE_R = 1.15;

/**
 * Radial displacement as a fraction of the ring spacing.
 *
 * Ring spacing rather than radius, because that is what keeps the mesh a mesh:
 * a displacement bigger than the gap lets a vertex cross the ring outside it,
 * and crossed rings read as a tangle rather than as a surface.
 */
const DISPLACE = 0.62;

/** A polar lattice with its neighbours joined — the mesh, not the marks. */
export default defineGenerator<PolarMesh>({
  name: 'polar-mesh',
  label: 'Polar Mesh',
  description:
    'A polar lattice with its neighbours joined — the mesh, not the marks.',
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
    // Every vertex is emitted twice — once in its ring, once in its spoke — so
    // the vertex count is the file size. `rings × spokes` at density 1 is about
    // 900, which lands well inside the data-URI budget.
    const rings = Math.round(lerp(9, 17, p.density));
    const spokes = Math.round(lerp(30, 54, p.density));
    const ox = range(rng, -40, 40);
    const oy = range(rng, -40, 40);
    const noiseSeed = Math.floor(range(rng, 1, 9999));
    const spinRoll = rng();
    const rippleRoll = rng();
    return {
      rings,
      spokes,
      noiseSeed,
      ox,
      oy,
      // Whole turns, whole ripples: both must be integers or the mesh is caught
      // mid-motion at `t = 1` and the loop shows a seam.
      spin: cycles(spinRoll, 2),
      ripples: cycles(rippleRoll, 3) + 1,
      ripplesPerLoop: cycles(rippleRoll * 7, 2),
    };
  },

  /**
   * ## The angle is periodic already, so the noise closes for free
   *
   * `terrain-mesh` has to walk a circle through noise space to get a profile
   * that is aperiodic across the frame and yet exactly periodic in the loop.
   * Here the awkward coordinate is `θ`, and `θ` closes on itself by
   * construction — so sampling the noise at `(R·cos θ, R·sin θ)` is not a trick
   * to make the loop work, it is simply what "a field on a circle" means. The
   * displacement at `θ = 0` and `θ = 2π` are the same number because they are
   * the same point in noise space, and the ring joins up with no seam to hide.
   *
   * Rings walk *concentric* circles, `RING_STEP` apart. Neighbouring rings are
   * therefore strongly correlated, so a bulge carries outward through several
   * of them and the mesh reads as one displaced surface rather than as a set of
   * independently wobbly rings.
   *
   * ## Rotation has to be whole turns
   *
   * The tempting alternative is to rotate by exactly one spoke's spacing, since
   * the lattice maps onto itself — but the *vertices* do not: vertex `i` lands
   * where vertex `i+1` was while keeping its own displacement, so the numbers
   * at `t = 1` differ from those at `t = 0` even though the picture is nearly
   * the same. Whole turns are the only rotation that closes exactly, and one or
   * two of them over a ten-second loop is a slow drift rather than a spin.
   *
   * The travelling wave is what stops that rotation reading as a rigid object
   * on a turntable: it moves *through* the mesh, outward from the centre, so
   * the surface is deforming while it turns.
   */
  project: (m, p, t) => {
    const [cx, cy] = centre(p);
    // Past the corners, so the outermost ring never shows as an edge.
    const maxR = Math.hypot(p.width, p.height) * 0.44;
    const step = maxR / m.rings;
    const spinNow = t * TAU * m.spin;

    const xs: number[][] = [];
    const ys: number[][] = [];
    for (let j = 0; j < m.rings; j++) {
      const baseR = step * (j + 1);
      // One travelling wave for the whole ring: `ripples` cycles across the
      // radius, `ripplesPerLoop` whole cycles in time, so it closes at `t = 1`.
      const swell =
        (wave(baseR / maxR, t, m.ripples, m.ripplesPerLoop) - 0.5) * 2;
      const amp = step * DISPLACE * Math.min(1, (j + 1) / 3);
      const rx: number[] = [];
      const ry: number[] = [];
      for (let i = 0; i < m.spokes; i++) {
        const a = (i / m.spokes) * TAU;
        // Sampled at the *unrotated* angle, so the displacement is attached to
        // the vertex and turns with it rather than sweeping through the mesh.
        const n =
          valueNoise(
            m.ox + NOISE_R * Math.cos(a),
            m.oy + NOISE_R * Math.sin(a) + j * RING_STEP,
            m.noiseSeed,
          ) - 0.5;
        // Faded in over the first few rings. The displacement is a fraction of
        // the ring *spacing*, which is a modest bump out at the rim and most of
        // the radius at ring 1 — applied flat, the innermost rings turn inside
        // out and collapse into a knot at the centre.
        const r = baseR + amp * (n * 1.9 + swell * 0.8);
        const th = a + spinNow;
        rx.push(cx + r * Math.cos(th));
        ry.push(cy + r * Math.sin(th));
      }
      xs.push(rx);
      ys.push(ry);
    }

    let out = '';
    // Spokes first, then rings over them: the rings are the brighter of the two
    // families and reading them as continuous is what makes the thing a mesh
    // rather than a spider's web. Brighter than they look like they should be,
    // though — at alpha 0.16 they vanished entirely and the generator rendered
    // as concentric circles, which is a mark, not a mesh.
    for (let i = 0; i < m.spokes; i++) {
      let d = `M${r2(cx)} ${r2(cy)} `;
      for (let j = 0; j < m.rings; j++)
        d += `L${r2(xs[j][i])} ${r2(ys[j][i])} `;
      // Position on the ramp is normalised radius, which is what the mesh is
      // indexed by. A spoke crosses every ring, so it has no radius of its own
      // and takes the middle of the ramp — the average of what it passes
      // through, and the colour the rings it crosses average to.
      out += `<path d="${d.trim()}" fill="none" stroke="${ink(p, 0.5, 0.3)}" stroke-width="${r2(p.strokeWidth * 0.5)}"/>`;
    }
    for (let j = 0; j < m.rings; j++) {
      // `depth` is the ring's normalised radius, so the ramp runs from the
      // centre out — the axis the rings are already ordered and faded along.
      const depth = m.rings === 1 ? 0 : j / (m.rings - 1);
      let d = '';
      for (let i = 0; i < m.spokes; i++) {
        d += `${i === 0 ? 'M' : 'L'}${r2(xs[j][i])} ${r2(ys[j][i])} `;
      }
      // Closed, because a ring is closed. `Z` rather than repeating the first
      // vertex — fewer numbers, and the join is mitred properly.
      out += `<path d="${d.trim()} Z" fill="none" stroke="${ink(p, depth, r2(lerp(0.75, 0.32, depth)))}" stroke-width="${r2(p.strokeWidth * lerp(0.9, 0.4, depth))}" stroke-linejoin="round"/>`;
    }
    return frame(p, out);
  },
});
