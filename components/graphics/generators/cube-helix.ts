import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  ink,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
} from './shared';

/* ── cube-helix ───────────────────────────────────────────────────────────── */

interface Cube {
  /** Station along the helix axis, 0..1. Fixed for the whole loop. */
  u: number;
  /** Phase offset around the axis, so the corkscrew is not perfectly regular. */
  lean: number;
  lit: boolean;
}

interface Helix {
  cubes: Cube[];
  /** Whole turns of the corkscrew across the frame. */
  coils: number;
  /** Whole turns each cube advances per loop. Integer via `cycles`. */
  spin: number;
}

/**
 * Isometric cubes threaded onto a helix that crosses the frame.
 *
 * The axis runs left to right and dips through a broad sine; the cubes ride a
 * circle *around* that axis, drawn as an ellipse — wide axis in the picture
 * plane, squashed across it — which is what reads as a corkscrew rather than a
 * row of bobbing boxes.
 *
 * ## Depth, and why the sort order can be frozen
 *
 * `iso-cubes` sorts by `row + col`, which is painter's algorithm on a lattice.
 * Here there is no lattice, so depth has to be assigned explicitly, and *which*
 * axis carries it is the load-bearing decision: the helix recedes along its
 * axis, so `u` is depth. Cubes further along it are nearer — bigger, and drawn
 * later. The orbit is then entirely in the picture plane and moves nothing
 * toward or away from the viewer.
 *
 * That is what lets the order be decided once, in `sample`, and frozen. It has
 * to be: re-sorting per frame would reorder the emitted numbers, and the
 * coherence suite reads that as the composition re-rolling — indistinguishable,
 * number by number, from the confetti failure the sample/project split exists
 * to prevent. Had depth been taken from `cos(phase)` instead, the correct order
 * would genuinely change mid-loop and there would be no honest way to freeze
 * it; the geometry is arranged so the question does not arise.
 *
 * Faces are painted `p.occlusion` for the reason spelled out in `iso-cubes`:
 * `withAlpha(accent, 0.9)` still lets the cube behind through, and a stack of
 * translucent cubes is soup exactly where the depth cue was meant to be. Opaque
 * faces, form carried by the stroked edges on top.
 *
 * ## Travelling without arriving
 *
 * Cubes advance *along* the helix by phase, not by station: `phase = u·2π·coils
 * + 2π·spin·t`. Advancing `u` instead would march cubes off one end of the
 * frame and require new ones at the other, and a generator whose mark count
 * changes across the loop is the confetti signature. Advancing the phase moves
 * every cube through the same corkscrew the next one occupies, which is what
 * travel looks like, and closes exactly at `t = 1` because `spin` comes from
 * {@link cycles} and cannot be fractional.
 *
 * No {@link wobble} here, for the same reason as `spiral-warp`: a phase that
 * advances by whole turns is already zero-to-zero, and subtracting `f(0)` would
 * cancel the travel rather than anchor it.
 */

export default defineGenerator<Helix>({
  name: 'cube-helix',
  label: 'Cube Helix',
  description:
    'Isometric cubes threaded along a sine helix, nearer ones hiding those behind.',
  group: 'isometric',
  sketch: true,
  // Slower than the lattice generators, and the reason is geometric: a turn
  // at full reach covers the whole circumference, so what reads as a stately
  // rotation on a small form is a blur on a frame-filling one. See
  // `GeneratorModule.speed`.
  speed: 0.6,
  defaults: { density: 0.5, strokeWidth: 1.5 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Deliberately narrow. Every cube is five polygons plus a path, so density
    // buys a few more links in the chain and not an order of magnitude; the
    // data-URI budget is spent on geometry, not on count.
    // Fewer than it looks like it wants. Cubes are five polygons each and the
    // helix crosses the frame once, so past about thirty they stop reading as
    // beads on a thread and start reading as a solid tube.
    const count = Math.round(lerp(14, 26, p.density));
    const cubes: Cube[] = [];
    for (let i = 0; i < count; i++) {
      cubes.push({
        u: (i + 0.5) / count,
        lean: range(rng, -0.14, 0.14),
        lit: chance(rng, 0.22),
      });
    }
    // Drawn after the cubes so the per-cube stream above does not depend on
    // them — changing the coil count must not re-roll which cubes are lit.
    const coils = intRange(rng, 4, 5);
    const spin = cycles(rng(), 2);
    // Already in painter's order — `u` ascends with `i` — but sorted explicitly
    // because the order is the contract, not a side effect of the loop, and it
    // is frozen here rather than in `project` on purpose (see the docstring).
    return { cubes: cubes.sort((a, b) => a.u - b.u), coils, spin };
  },

  project: ({ cubes, coils, spin }, p, t) => {
    // Negative margin: the helix starts and ends *outside* the frame.
    //
    // Ending it inside made the thread a self-contained object with two visible
    // stops — an illustration of a helix rather than a length of one passing
    // through. Overrunning both edges is what makes it read as continuous, and
    // it costs nothing: the cubes beyond the edge are clipped by the viewBox.
    const marginX = -p.width * 0.14;
    const orbit = p.height * 0.2;
    const rot = TAU * spin * t;
    // Position on the ramp is `u`, the station along the helix axis — which is
    // also this generator's depth, since `u` is what sets both the size and the
    // draw order. The thread therefore graduates end to end, and a cube's hue
    // says how far along it sits, which is the one thing the near-edge-on view
    // otherwise leaves to size alone.
    //
    // The wire is a single path spanning the whole axis, so it cannot take a
    // position of its own: cutting it into per-segment strokes would change how
    // many marks the frame contains. It takes the midpoint, which is where a
    // one-colour line across a ramp belongs.
    const thread = ink(p, 0.5, 0.22);

    /** Where station `u` sits on screen, at the current phase. */
    const at = (u: number, lean: number) => {
      const phase = u * TAU * coils + rot + lean;
      // The axis: straight across, dipping through one broad sine so the helix
      // crosses the frame rather than sitting on its centreline.
      const ax = lerp(marginX, p.width - marginX, u);
      const ay =
        p.height * 0.5 + Math.sin(u * TAU * 0.75 - 0.6) * p.height * 0.14;
      // Ellipse, not circle: the orbit is seen near edge-on, so its across-view
      // component is squashed. The 0.5 is the same foreshortening the isometric
      // cube faces use.
      return {
        x: ax + Math.cos(phase) * orbit * 0.62,
        y: ay + Math.sin(phase) * orbit,
      };
    };

    // The thread first, so every cube paints over it — a wire that vanishes
    // behind the solids is the cheapest possible proof the occlusion works.
    const STEPS = 96;
    let wire = '';
    for (let i = 0; i <= STEPS; i++) {
      const q = at(i / STEPS, 0);
      wire += `${i === 0 ? 'M' : 'L'}${r2(q.x)} ${r2(q.y)}`;
    }
    let out = `<path d="${wire}" fill="none" stroke="${thread}" stroke-width="${p.strokeWidth}"/>`;

    for (const c of cubes) {
      const q = at(c.u, c.lean);
      const edge = ink(p, c.u, 0.6);
      const litTop = ink(p, c.u, 0.9);
      const dimTop = ink(p, c.u, 0.18);
      // Nearer cubes are bigger. Monotonic in `u`, which is the same quantity
      // the draw order uses, so size and occlusion can never disagree.
      const cw = lerp(0.6, 1.2, c.u) * lerp(46, 38, p.density);
      const halfW = cw / 2;
      const halfH = cw * 0.29;
      const hgt = cw * 0.72;
      const bx = q.x;
      const by = q.y + hgt / 2;
      const top = by - hgt;
      const left = `${r2(bx - halfW)},${r2(by - halfH)} ${r2(bx)},${r2(by)} ${r2(bx)},${r2(top)} ${r2(bx - halfW)},${r2(top - halfH)}`;
      const right = `${r2(bx + halfW)},${r2(by - halfH)} ${r2(bx)},${r2(by)} ${r2(bx)},${r2(top)} ${r2(bx + halfW)},${r2(top - halfH)}`;
      const cap = `${r2(bx)},${r2(top)} ${r2(bx + halfW)},${r2(top - halfH)} ${r2(bx)},${r2(top - halfH * 2)} ${r2(bx - halfW)},${r2(top - halfH)}`;
      out += `<polygon points="${left}" fill="${p.occlusion}"/>`;
      out += `<polygon points="${right}" fill="${p.occlusion}"/>`;
      out += `<polygon points="${cap}" fill="${c.lit ? litTop : dimTop}"/>`;
      out += `<path d="M${r2(bx - halfW)} ${r2(top - halfH)} L${r2(bx)} ${r2(top)} L${r2(bx + halfW)} ${r2(top - halfH)} M${r2(bx)} ${r2(top)} L${r2(bx)} ${r2(by)} M${r2(bx - halfW)} ${r2(by - halfH)} L${r2(bx - halfW)} ${r2(top - halfH)} M${r2(bx + halfW)} ${r2(by - halfH)} L${r2(bx + halfW)} ${r2(top - halfH)} M${r2(bx - halfW)} ${r2(by - halfH)} L${r2(bx)} ${r2(by)} L${r2(bx + halfW)} ${r2(by - halfH)}" fill="none" stroke="${edge}" stroke-width="${p.strokeWidth}"/>`;
      out += `<polygon points="${cap}" fill="none" stroke="${edge}" stroke-width="${p.strokeWidth}"/>`;
    }
    return frame(p, out);
  },
});
