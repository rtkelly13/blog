import { defineGenerator } from '../types';
import { orbitSources, type Source, WAVE_FALLOFF } from './interference';
import type { Rng } from './shared';
import {
  frame,
  ink,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
} from './shared';

/* ── ripple ───────────────────────────────────────────────────────────────── */

interface Dot {
  /** Rest position on the lattice. */
  x: number;
  y: number;
  /** Rest radius, before the wave swells or shrinks it. */
  r: number;
  /**
   * Distance from the source cluster at rest, 0..1 — where this dot sits on the
   * colour ramp.
   *
   * A ripple's own axis is radius from where the stone went in, so that is the
   * axis the colour takes. Frozen at rest rather than recomputed per frame: the
   * dots are meant to read as a *fixed* grid being disturbed, and a hue that
   * chased the live distance would make the lattice itself look like it was
   * flowing outward, which is exactly the illusion this is not.
   */
  pos: number;
}

interface Field {
  sources: Source[];
  dots: Dot[];
  /**
   * The normaliser for swell and brightness — a fraction of the summed source
   * amplitudes rather than the whole of it.
   *
   * The full sum is only reached where every source crests at once *and* none
   * of them has faded with distance, which happens essentially nowhere. Dividing
   * by it leaves the field living in the middle of its range, every dot much the
   * same size, and the wave invisible. Normalising against the value actually
   * reached puts real crests and real troughs on screen; the clamp handles the
   * rare point that exceeds it.
   */
  reach: number;
}

/**
 * `interference`'s wave field, sampled as a lattice of dots rather than as rules.
 *
 * Same physics, same sources, same falloff — a completely different reading.
 * The parent draws the field as continuous horizontal rules, and a rule *is* a
 * contour: the eye joins it up and follows it, so the picture is about lines
 * and the wave is what bends them. Break the same field into discrete marks and
 * there is nothing to follow, so the eye reads the marks against the lattice it
 * knows they came from and sees *displacement* instead. It is the difference
 * between a topographic map and iron filings.
 *
 * Three cues carry the wave here, all from the one field value:
 *
 *  - **Position** — each dot is pushed along the line away from the sources, so
 *    dots bunch at the crests and thin in the troughs. This is the one that
 *    reads first, and the reason the displacement is radial rather than the
 *    parent's vertical: a dot grid has no preferred direction, so a vertical
 *    push would look like a printing error rather than like a wave.
 *  - **Size** — crests swell, troughs shrink. Bunching alone reads as jitter at
 *    small amplitudes; size makes the wavefronts legible even where the
 *    displacement is slight.
 *  - **Brightness** — the same value again, so the crests come forward.
 *
 * All three from the same scalar is deliberate. Driving them from separate
 * terms would decorrelate them and the grid would look noisy; agreeing, they
 * read as one surface seen from above.
 */

/**
 * Fraction of the summed amplitude a point in the field actually reaches, near
 * enough. Measured rather than derived — the falloff and the phase disagreements
 * between sources make the true figure a property of the composition.
 */
const REALISED = 0.55;

/** Rest radius range, in pixels, before the wave swells it. */
const DOT_MIN = 2.6;
const DOT_MAX = 5;

/**
 * How far a dot is pushed at a full crest, as a fraction of the lattice gap.
 *
 * Tuned against the measurement rather than by eye: the suite floors peak
 * displacement at 10px, and 0.42 measured 11.05 — arithmetically passing and
 * visually a tremble. This clears it with room while staying under the point
 * where neighbouring rows converge enough to cross and the lattice reads as
 * noise rather than as a disturbed grid.
 */
const PUSH_OF_GAP = 0.58;

export default defineGenerator<Field>({
  name: 'ripple',
  label: 'Ripple',
  description:
    'Concentric wave distortion drawn as a field of marks rather than as rules.',
  group: 'field',
  sketch: true,
  speed: 0.9,
  defaults: { density: 0.5, strokeWidth: 1 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // Two or three, like the parent, and for the parent's reason: this is the
    // "stones in a pond" reading, and the concentric fronts have to stay
    // traceable. `resonance` is where the count goes up.
    const count = intRange(rng, 2, 3);
    const sources: Source[] = [];
    let reach = 0;
    for (let i = 0; i < count; i++) {
      const s: Source = {
        x: range(rng, p.width * 0.2, p.width * 0.8),
        y: range(rng, p.height * 0.2, p.height * 0.8),
        // Lower frequencies than the parent's: a dot grid samples the field at
        // the lattice pitch, and fronts spaced closer than a few cells alias
        // into a shimmer that has no visible centre.
        freq: range(rng, 0.014, 0.03),
        amp: range(rng, 12, 20),
        orbit: range(rng, 30, 90),
        orbitPhase: range(rng, 0, TAU),
        orbitCycles: intRange(rng, 1, 2),
      };
      sources.push(s);
      reach += s.amp * REALISED;
    }

    // The cluster's centre at rest, for the colour ramp.
    let cx = 0;
    let cy = 0;
    for (const s of sources) {
      cx += s.x;
      cy += s.y;
    }
    cx /= sources.length;
    cy /= sources.length;
    const far = Math.hypot(p.width, p.height) * 0.6;

    // Floor raised for the element budget — 26px put 1,530 dots on screen.
    const gap = lerp(46, 36, p.density);
    const dots: Dot[] = [];
    // Half a gap of inset all round, and one extra ring of cells past each edge:
    // dots near the border are pushed *outward* as often as inward, and without
    // the overhang a crest arriving at the edge leaves a visible bald strip.
    for (let y = -gap / 2; y < p.height + gap; y += gap) {
      for (let x = -gap / 2; x < p.width + gap; x += gap) {
        dots.push({
          x,
          y,
          r: range(rng, DOT_MIN, DOT_MAX),
          pos: Math.min(1, Math.hypot(x - cx, y - cy) / far),
        });
      }
    }
    return { sources, dots, reach };
  },

  project: (f, p, t) => {
    const at = orbitSources(f.sources, t);
    const gap = lerp(46, 26, p.density);
    const push = gap * PUSH_OF_GAP;
    let out = '';
    for (const dot of f.dots) {
      // The field, and the direction it pushes in, in one pass: the parent's
      // `waveAt` returns only the scalar, and a dot needs the outward unit
      // vector as well.
      let wave = 0;
      let vx = 0;
      let vy = 0;
      for (const s of at) {
        const dx = dot.x - s.x;
        const dy = dot.y - s.y;
        // Guarded, because a dot landing exactly on a source would divide by
        // zero and put a NaN in the output — rare, but the lattice and the
        // orbits are both regular enough that "rare" means "eventually".
        const dist = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        const v =
          s.amp * Math.sin(dist * s.freq) * (1 / (1 + dist * WAVE_FALLOFF));
        wave += v;
        vx += (dx / dist) * v;
        vy += (dy / dist) * v;
      }
      // Normalised to -1..1 so swell and brightness are independent of how many
      // sources happen to be in play.
      const k = Math.max(-1, Math.min(1, wave / f.reach));
      // The push is the *unnormalised* vector scaled, not a unit direction
      // times the scalar. Normalising is the obvious spelling and it is
      // unstable: between two opposed sources the summed vector passes through
      // zero, and a unit direction taken across that zero flips by 180° in a
      // single frame — a dot teleporting the full push width while the field it
      // is reading changes by almost nothing. Scaling the raw vector fades the
      // displacement out and back in through the same point instead.
      const cxp = dot.x + (vx / f.reach) * push;
      const cyp = dot.y + (vy / f.reach) * push;
      // 0.38..1.62 of the rest radius — never zero, so no dot ever winks out
      // and the mark count is structurally constant across the loop. The swell
      // does more of the work than the displacement does: a crest that is only
      // 0.6 of a cell wide in travel is unmistakable when the marks on it are
      // also four times the area of the ones in the trough.
      const rad = dot.r * (1 + 0.62 * k);
      out += `<circle cx="${r2(cxp)}" cy="${r2(cyp)}" r="${r2(rad)}" fill="${ink(p, dot.pos, r2(0.2 + 0.65 * (0.5 + 0.5 * k)))}"/>`;
    }
    return frame(p, out);
  },
});
