import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  cycles,
  disorderAt,
  frame,
  ink,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  scramble,
  TAU,
} from './shared';

/* ── spiral-warp ──────────────────────────────────────────────────────────── */

interface Mark {
  x: number;
  y: number;
  /** Half-length of the dash, in viewBox units. */
  half: number;
  /** Per-mark ink weight. Sampled, never derived from `t` — see below. */
  tone: number;
}

interface Warp {
  marks: Mark[];
  /** Arms in the spiral. Integer, so the arm field is periodic in `theta`. */
  arms: number;
  /** Whole turns the spiral rotates through per loop. Integer via `cycles`. */
  spin: number;
}

/**
 * A rectangular lattice of dashes, dragged into an Archimedean spiral.
 *
 * The subject is the *gradient*, not the spiral. A spiral on its own is a
 * radial generator and we have those; what this draws is the seam between two
 * orders — strict grid at the edges, arms at the centre — so the eye gets to
 * see the lattice give way. `grip` is that ramp: `(1 − r/R)³`, one at the
 * centre, zero by the time the reach `R` is spent, cubed so the ordered end
 * holds on rather than softening from the first row out. Same reasoning as
 * `disorderAt`, applied radially instead of down the frame.
 *
 * The arms themselves are a field, not a drawn curve. `arm = n(θ − rot) − k·r`
 * is constant along an Archimedean spiral, so pulling each mark *down the
 * gradient* of `sin(arm)` condenses the lattice onto the arms wherever `grip`
 * allows it. The marks stay the marks they were: nothing is added, removed or
 * re-rolled, which is what keeps the mark count fixed across the loop.
 *
 * ## Why the animation rotates a phase rather than printing a transform
 *
 * The obvious way to wind the arms is `<g transform="rotate(360t)">`, and it
 * does not close: the printed angle at `t = 1` is `360`, textually different
 * from the `0` at `t = 0`, so the emitted SVG differs at the seam even though
 * the picture matches. Rotating the spiral *inside* the field instead —
 * `rot = 2π · spin · t`, consumed only by `cos`/`sin` — closes exactly, because
 * a rotation by a whole number of turns is the identity on the plane and
 * `spin` comes from {@link cycles}, which cannot return a float.
 *
 * Note there is no {@link wobble} here. `wobble` exists to make `f(t) − f(0)`
 * vanish at both ends; a phase that advances by whole turns already does, and
 * subtracting its value at zero would only cancel the rotation.
 *
 * ## Why the colours are sampled and never touched by `t`
 *
 * Tempting: fade each dash with `sin(arm)` so the arms glow as they sweep.
 * `withAlpha` prints `rgba(34, 211, 238, 0.42)`, and the coherence suite counts
 * *numbers* in the emitted SVG — an alpha that rounds to `1` at some frames and
 * `0.42` at others still yields one token, but nothing guarantees that for
 * every colour form, and a colour that varies with `t` is exactly the sort of
 * thing that later grows a second decimal. Weight is sampled per mark instead,
 * and the arms are drawn by *position*, which is what they should be drawn by.
 */

export default defineGenerator<Warp>({
  name: 'spiral-warp',
  label: 'Spiral Warp',
  description:
    'A rectangular lattice of dashes, dragged into an Archimedean spiral toward the centre.',
  group: 'lattice',
  sketch: true,
  defaults: { density: 0.5, strokeWidth: 1.6 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Density caps out at a spacing that still leaves the dashes readable —
    // any tighter and the arms fill in as a smear rather than as marks.
    const spacing = lerp(78, 38, p.density);
    const marks: Mark[] = [];
    for (let y = spacing / 2; y < p.height + spacing / 2; y += spacing) {
      for (let x = spacing / 2; x < p.width + spacing / 2; x += spacing) {
        const chaos = disorderAt(p, y);
        marks.push({
          // Hashed, not drawn: `disorder = 0` has to consume exactly the same
          // stream as `disorder = 1`, or the ramp would re-roll the lattice.
          x: x + chaos * spacing * 0.5 * scramble(x, y, 5),
          y: y + chaos * spacing * 0.5 * scramble(x, y, 6),
          half: range(rng, 0.24, 0.4) * spacing,
          tone: range(rng, 0.3, 0.72),
        });
      }
    }
    // Both drawn after the lattice, so the per-mark stream above is untouched
    // by them and a change of arm count does not re-roll the composition.
    const arms = intRange(rng, 2, 4);
    return { marks, arms, spin: cycles(rng(), 2) };
  },

  project: ({ marks, arms, spin }, p, t) => {
    const cx = p.width / 2;
    const cy = p.height / 2;
    // Reach of the warp. Short of the half-diagonal on purpose: the corners
    // have to stay a plain grid, or there is no gradient to read.
    const reach = Math.hypot(p.width, p.height) * 0.46;
    // Turns of the spiral across the reach, as an angular rate per unit radius.
    const twist = (TAU * 2.2) / reach;
    const rot = TAU * spin * t;
    let out = '';
    for (const m of marks) {
      const dx = m.x - cx;
      const dy = m.y - cy;
      const r = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);
      const ramp = Math.max(0, 1 - r / reach);
      const grip = ramp * ramp * ramp;
      // Position on the ramp is `grip`: the corners, which the warp never
      // reaches and which stay a plain lattice, sit at one end, and the centre
      // the spiral gathers everything into sits at the other. It is the same
      // number that does the warping, so hue and deformation cannot disagree.

      // Zero on an arm, and signed either side of it.
      const arm = arms * (theta - rot) - twist * r;
      const off = Math.sin(arm);
      // Down-gradient in both directions at once: the angular term gathers the
      // lattice onto the arms, the radial term gives them thickness. Divided by
      // `arms` so a four-armed spiral does not pull four times as hard.
      const spun = theta - (grip * 2.4 * off) / arms;
      const rad = r + grip * off * m.half * 3;
      const px = cx + rad * Math.cos(spun);
      const py = cy + rad * Math.sin(spun);
      // Orientation blends from the lattice's own axis to the arm's tangent.
      // The tangent of `arm = const` has `dθ/dr = twist/arms`, hence the
      // arctangent of the tangential component over the radial one; scaling the
      // whole angle by `grip` is what makes the outer dashes lie flat in rows.
      const tangent = spun + Math.atan2((rad * twist) / arms, 1);
      const angle = tangent * grip;
      const hx = m.half * Math.cos(angle);
      const hy = m.half * Math.sin(angle);
      out += `<line x1="${r2(px - hx)}" y1="${r2(py - hy)}" x2="${r2(px + hx)}" y2="${r2(py + hy)}" stroke="${ink(p, grip, r2(m.tone))}" stroke-width="${p.strokeWidth}" stroke-linecap="round"/>`;
    }
    return frame(p, out);
  },
});
