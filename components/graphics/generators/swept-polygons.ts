import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  cycles,
  frame,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  withAlpha,
} from './shared';

/* ── swept-polygons ───────────────────────────────────────────────────────── */

interface Ring {
  /** Radius as a fraction of reach. */
  radius: number;
  /** Starting rotation, so the rings do not all begin vertex-aligned. */
  phase: number;
  /** Whole turns per loop, signed — alternate rings counter-rotate. */
  spin: number;
}

/**
 * Concentric polygons joined by swept parallels; the moire between them is the
 * effect.
 *
 * String art, not linework. The polygons themselves are almost incidental —
 * what the eye reads is the *caustics*: sweep evenly spaced chords between two
 * polygons that are rotated relative to one another and the chords bunch
 * wherever their spacing collapses, drawing curved bright envelopes that no
 * single line is part of. Each band produces its own family, and neighbouring
 * families overlap, so the interference is between the envelopes rather than
 * between the strokes.
 *
 * That is also why the rings are polygons rather than circles. Chords swept
 * between two concentric *circles* are a uniform annulus with one caustic and
 * no structure; the flats and corners of a polygon vary the chord length
 * periodically, which is what breaks the family into lobes.
 *
 * Counter-rotation is what animates it: alternate rings turn opposite ways, so
 * every band's relative twist changes at twice the rate of either ring and the
 * caustics sweep round rather than merely orbiting. The rotation is consumed by
 * `cos`/`sin` rather than printed as a `rotate()` — see `broken-ring`: a
 * printed `rotate(360)` and `rotate(0)` draw the same picture from different
 * strings, so the loop-closure test compares bytes and fails.
 *
 * Sweep counts are deliberately modest. Moire is a function of the *ratio*
 * between the two families, not of how many lines are in them, and the budget
 * here is a data URI inlined into a page — doubling the sweeps doubles the
 * bytes and adds nothing the ratio was not already doing.
 */

export default defineGenerator<Ring[]>({
  name: 'swept-polygons',
  label: 'Swept Polygons',
  description:
    'Concentric polygons joined by swept parallels; the moire between them is the effect.',
  group: 'radial',
  defaults: { density: 0.55, strokeWidth: 1 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const count = Math.round(lerp(4, 7, p.density));
    const rings: Ring[] = [];
    for (let i = 0; i < count; i++) {
      // Radii spaced with a slight bias outwards: even spacing puts the widest
      // band where there is least room for the chords to fan out.
      const f = i / (count - 1);
      const wobbleOfRing = rng();
      rings.push({
        radius: lerp(0.22, 1, f ** 0.85),
        phase: range(rng, 0, TAU),
        // One turn per loop, never two. At this reach a second turn puts the
        // outer rim past 400px/s, which stops reading as rotation and starts
        // reading as a strobe. `cycles(v, 1)` is pinned to 1 by construction;
        // the sign is what does the work.
        spin: cycles(wobbleOfRing, 1) * (i % 2 ? -1 : 1),
      });
    }
    return rings;
  },

  project: (rings, p, t) => {
    const cx = p.width / 2;
    const cy = p.height / 2;
    const reach = Math.min(p.width, p.height) * 0.6;
    // Six to eight sides would mean sampling it, and a sampled side count
    // changes the emitted-number count with the seed rather than with `t`,
    // which is legal but makes the structural golden a lottery. Seven is the
    // choice that pays: an odd count never aligns a vertex with the vertex of
    // the ring inside it, so no band is ever momentarily symmetric.
    const SIDES = 7;
    // Fixed, not density-derived: the chord count is the other half of the
    // moire ratio, and letting the density move it changes the pattern rather
    // than the amount of it.
    const SWEEPS = 120;

    /** A point at parameter `s` (turns) around a rotated regular polygon. */
    const at = (s: number, spin: number, r: number) => {
      const u = (s % 1) * SIDES;
      const v = Math.floor(u);
      const f = u - v;
      // Walk the edge rather than the arc: the linear interpolation between
      // two vertices is what makes the flats flat, and the flats are what give
      // the chord family its lobes.
      const a0 = spin + (v * TAU) / SIDES;
      const a1 = spin + ((v + 1) * TAU) / SIDES;
      const x0 = Math.cos(a0) * r;
      const y0 = Math.sin(a0) * r;
      return {
        x: cx + x0 + (Math.cos(a1) * r - x0) * f,
        y: cy + y0 + (Math.sin(a1) * r - y0) * f,
      };
    };

    const sweep = withAlpha(p.accent, 0.18);
    const edge = withAlpha(p.accent, 0.55);
    let out = '';

    // Rotations first, so a band can read both of its rings' current angles.
    const spins = rings.map((ring) => ring.phase + t * TAU * ring.spin);

    for (let i = 0; i < rings.length; i++) {
      const ring = rings[i];
      const r = ring.radius * reach;
      let pts = '';
      for (let v = 0; v < SIDES; v++) {
        const a = spins[i] + (v * TAU) / SIDES;
        pts += `${r2(cx + Math.cos(a) * r)},${r2(cy + Math.sin(a) * r)} `;
      }
      out += `<polygon points="${pts.trim()}" fill="none" stroke="${edge}" stroke-width="${r2(p.strokeWidth)}"/>`;

      // The band between this ring and the next. The last ring has no outer
      // partner, so it emits no chords — a fixed asymmetry in the structure,
      // not a per-frame one, so the count stays constant across the loop.
      if (i + 1 >= rings.length) continue;
      const outer = rings[i + 1];
      const rOut = outer.radius * reach;
      for (let k = 0; k < SWEEPS; k++) {
        const s = k / SWEEPS;
        // Same parameter on both rings. The offset between the families is the
        // difference in the two rotations alone, which is why counter-rotation
        // and not translation is what animates the interference.
        const a = at(s, spins[i], r);
        const b = at(s, spins[i + 1], rOut);
        out += `<line x1="${r2(a.x)}" y1="${r2(a.y)}" x2="${r2(b.x)}" y2="${r2(b.y)}" stroke="${sweep}" stroke-width="${r2(p.strokeWidth * 0.6)}"/>`;
      }
    }
    return frame(p, out);
  },
});
