import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  frame,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  withAlpha,
} from './shared';

/* ── kaleidoscope ─────────────────────────────────────────────────────────── */

/** A lattice line, stored as its two endpoints in polar form about the centre. */
interface Chord {
  r0: number;
  a0: number;
  r1: number;
  a1: number;
  hot: boolean;
}

/**
 * One line of a vertex fan: tangent to the circle of radius `d` at angle `ang`,
 * `half` long either side of the point of tangency.
 *
 * Stored as a tangent rather than as two endpoints because that is what keeps
 * the fans off the lattice — see the note in `sample`.
 */
interface Fan {
  d: number;
  ang: number;
  half: number;
  /** 1 at the hexagon, a quarter of that at the frame's diagonal. */
  fade: number;
  hot: boolean;
}

interface Mandala {
  cx: number;
  cy: number;
  lattice: Chord[];
  fans: Fan[];
  phase: number;
}

/** The six outward edge normals of a hexagon whose vertices sit at k·60°. */
const HEX_NORMALS = Array.from(
  { length: 6 },
  (_, k) => Math.PI / 6 + (k * Math.PI) / 3,
);

/**
 * The span of an infinite line inside the hexagon, as a parameter range.
 *
 * The line is `c·n + s·u` for the unit normal `n` at angle `phi`; the hexagon is
 * the intersection of six half-planes, so clipping is six one-dimensional
 * bounds on `s` rather than a polygon walk. Runs in `sample`, on the unrotated
 * figure — the whole mandala turns rigidly, so the chords are cut once and the
 * rotation is applied to their endpoints in `project`.
 *
 * An empty span returns `[0, 0]` instead of nothing: a family member that fell
 * outside would otherwise change the emitted-number count with the sample,
 * which is the confetti signature the suite watches for. A zero-length line is
 * invisible and costs the same two coordinates as any other.
 */
function chordOfHexagon(
  phi: number,
  c: number,
  apothem: number,
): [number, number] {
  const nx = Math.cos(phi);
  const ny = Math.sin(phi);
  const ux = -ny;
  const uy = nx;
  let s0 = -1e6;
  let s1 = 1e6;
  for (const m of HEX_NORMALS) {
    const mx = Math.cos(m);
    const my = Math.sin(m);
    const denom = ux * mx + uy * my;
    const rhs = apothem - c * (nx * mx + ny * my);
    if (Math.abs(denom) < 1e-9) {
      // Parallel to this edge: the constraint either holds everywhere or
      // nowhere, and there is no `s` that can fix it.
      if (rhs < 0) return [0, 0];
    } else if (denom > 0) {
      s1 = Math.min(s1, rhs / denom);
    } else {
      s0 = Math.max(s0, rhs / denom);
    }
  }
  return s1 > s0 ? [s0, s1] : [0, 0];
}

/**
 * A triangular lattice inside a hexagon, with tangent line fans off its
 * vertices.
 *
 * Two structures that read as one mandala. Inside: three families of parallel
 * chords at the hexagon's three edge directions, which is the whole triangular
 * lattice — a triangular grid *is* three line families, and drawing it as
 * chords rather than as triangles means the outermost member of each family is
 * the hexagon's own edge, so the boundary comes free.
 *
 * Outside: at each vertex, a family of evenly-spaced lines tangent to circles
 * of growing radius. Tangency is doing real work here. A tangent at distance
 * `d` cannot come within `d` of the centre, so as long as the nearest one
 * starts outside the circumradius the fans can never touch the lattice — no
 * clipping, no gap to tune, and the interior stays legible however dense the
 * fans get.
 *
 * The two counter-rotate. That is the kaleidoscope: at `t = 0` each fan sits
 * square on its vertex, and everywhere else in the loop the six fans have
 * slipped off the hexagon they belong to, so the same fixed geometry keeps
 * finding new alignments. Both turns are consumed by `cos`/`sin` rather than
 * printed as a `rotate()`, for the reason `broken-ring` sets out: `360` and `0`
 * draw the same picture and are different strings, so a printed whole turn
 * fails loop closure while a rotated coordinate does not.
 */

/**
 * How far a fan line runs either side of its point of tangency, per unit of
 * radius. `tan(30°) ≈ 0.577` exactly fills a sector; above it the fans lace.
 */
const SECTOR_FILL = 0.63;

/** Whole turns per loop. Signed, and the signs are the point. */
const LATTICE_SPIN = -1;
const FAN_SPIN = 1;

export default defineGenerator<Mandala>({
  name: 'kaleidoscope',
  label: 'Kaleidoscope',
  description:
    'A triangular lattice inside a polygon, with tangent line families radiating off its vertices.',
  group: 'radial',
  // Slower than the lattice generators, and the reason is geometric: a turn
  // at full reach covers the whole circumference, so what reads as a stately
  // rotation on a small form is a blur on a frame-filling one. See
  // `GeneratorModule.speed`.
  speed: 0.4,
  defaults: { density: 0.5, strokeWidth: 1.5 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cx = p.width / 2;
    const cy = p.height / 2;
    // The frame's own circumradius — every fan is cut to this, so the mandala
    // covers the corners without any coordinate escaping the diagonal.
    const reach = Math.hypot(p.width, p.height) / 2;
    const hexR = Math.min(p.width, p.height) * 0.34;
    const apothem = hexR * Math.cos(Math.PI / 6);
    // The base orientation of the whole figure, and the only thing the seed
    // moves about the geometry — a lattice this regular has nothing to jitter
    // that would not read as a mistake, exactly as `radial-spokes` argues for
    // its spoke angles.
    const phase = range(rng, 0, TAU);

    // Even, so the three families share a division point at the centre and the
    // lattice closes on itself rather than sitting a half-cell off.
    const steps = 2 * Math.round(lerp(3, 7, p.density));
    const lattice: Chord[] = [];
    for (let j = 0; j < 3; j++) {
      const phi = Math.PI / 6 + (j * Math.PI) / 3;
      for (let i = 0; i <= steps; i++) {
        const c = apothem * ((2 * i) / steps - 1);
        const [s0, s1] = chordOfHexagon(phi, c, apothem);
        const nx = Math.cos(phi);
        const ny = Math.sin(phi);
        const x0 = c * nx - s0 * ny;
        const y0 = c * ny + s0 * nx;
        const x1 = c * nx - s1 * ny;
        const y1 = c * ny + s1 * nx;
        lattice.push({
          r0: Math.hypot(x0, y0),
          a0: Math.atan2(y0, x0),
          r1: Math.hypot(x1, y1),
          a1: Math.atan2(y1, x1),
          hot: chance(rng, 0.12),
        });
      }
    }

    const perFan = Math.round(lerp(12, 26, p.density));
    // From just clear of the circumradius out to the frame's diagonal.
    const near = hexR * 1.08;
    const gap = (reach - near) / perFan;
    const fans: Fan[] = [];
    for (let k = 0; k < 6; k++) {
      const ang = (k * TAU) / 6;
      for (let i = 0; i < perFan; i++) {
        const d = near + i * gap;
        fans.push({
          d,
          ang,
          // Length is what decides whether this reads as a mandala or as
          // wallpaper. Cut to the frame's circumcircle, the near tangents span
          // the whole viewBox and six fans of them are just a grid of long
          // lines — the first pass did exactly that. Growing the half-length in
          // proportion to `d` instead confines each family to its own sector:
          // `tan(30°)` fills the sector exactly, and the excess over it is the
          // overlap that laces neighbouring fans into a star rather than
          // leaving six wedges butted together.
          half: d * SECTOR_FILL,
          fade: 1 - (0.75 * i) / perFan,
          hot: chance(rng, 0.06),
        });
      }
    }

    return { cx, cy, lattice, fans, phase };
  },

  project: (m, p, t) => {
    const faint = withAlpha(p.accent, 0.3);
    const bright = withAlpha(p.accent, 0.7);
    const latticeRot = m.phase + t * TAU * LATTICE_SPIN;
    const fanRot = m.phase + t * TAU * FAN_SPIN;
    let out = '';

    for (const c of m.lattice) {
      const x0 = m.cx + Math.cos(c.a0 + latticeRot) * c.r0;
      const y0 = m.cy + Math.sin(c.a0 + latticeRot) * c.r0;
      const x1 = m.cx + Math.cos(c.a1 + latticeRot) * c.r1;
      const y1 = m.cy + Math.sin(c.a1 + latticeRot) * c.r1;
      out += `<line x1="${r2(x0)}" y1="${r2(y0)}" x2="${r2(x1)}" y2="${r2(y1)}" stroke="${c.hot ? bright : faint}" stroke-width="${r2(p.strokeWidth * (c.hot ? 1.5 : 0.9))}"/>`;
    }

    for (const f of m.fans) {
      const a = f.ang + fanRot;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      // A shimmer travelling out along each fan, on its own whole-cycle phase
      // so it does not have to borrow the rotation's.
      const glow = 0.5 + 0.5 * Math.sin(f.d * 0.02 - t * TAU * 2);
      // Faded by distance as well. Without this the outermost rungs — which are
      // also the longest — are the loudest thing in the frame, and six fans of
      // them read as stray lines rather than as anything centred.
      const alpha = (f.hot ? 0.34 + 0.3 * glow : 0.1 + 0.3 * glow) * f.fade;
      const px = m.cx + nx * f.d;
      const py = m.cy + ny * f.d;
      out += `<line x1="${r2(px - ny * f.half)}" y1="${r2(py + nx * f.half)}" x2="${r2(px + ny * f.half)}" y2="${r2(py - nx * f.half)}" stroke="${withAlpha(p.accent, r2(alpha))}" stroke-width="${r2(p.strokeWidth * (f.hot ? 1.4 : 0.7))}"/>`;
    }

    return frame(p, out);
  },
});
