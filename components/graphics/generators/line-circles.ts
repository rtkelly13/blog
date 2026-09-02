import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  centre,
  chance,
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

/* ── line-circles ─────────────────────────────────────────────────────────── */

/**
 * One straight chord — a ruled stroke that happens to lie near a circle.
 *
 * Everything here is stored in *ring-relative* units rather than pixels,
 * because `project` is the only half that knows how big the frame is. `off` is
 * a fraction of the gap between neighbouring rings, so a ring is drawn just as
 * loosely at any size.
 */
interface Segment {
  /** Angle of the chord's midpoint on its ring, before spin. */
  angle: number;
  /** Half the arc the chord subtends. Also, therefore, its length. */
  span: number;
  /** Radial error, as a fraction of the gap between rings. */
  off: number;
  /** Rotation away from true tangency, in radians. */
  tilt: number;
  /** This chord's own phase, so a ring's chain comes apart unevenly. */
  phase: number;
  /** A few strokes are inked heavily — the ones a draughtsman leaned on. */
  hot: boolean;
}

interface Ring {
  /** Radius as a fraction of reach. */
  r: number;
  /** Whole turns per loop, signed. */
  spin: number;
  /** Whole cycles per loop of the slip-and-tilt breathing. */
  beat: number;
  segments: Segment[];
}

/**
 * How far a chord slides along its ring, as a multiple of its own half-length.
 *
 * Above 1 a chord travels further than it is long, so the gaps in the chain
 * open and close and neighbours swap places — which is what makes the ring look
 * *assembled* rather than merely dashed. Below about 0.5 the chain is rigid and
 * the whole thing reads as a dashed circle with a wobble.
 */
const SLIP = 0.85;

/** Peak extra tilt, in radians. A couple of degrees is already visible. */
const TILT_SWING = 0.09;

/** Peak radial error, as a fraction of the gap between neighbouring rings. */
const DRIFT = 0.3;

/**
 * Rings built out of loose straight segments, as though set out with a ruler.
 *
 * A variant of `orbit-rings`, and the difference is what a ring is *made of*.
 * The parent threads beads onto a wire: the marks are points, the circle is
 * real, and a faint guide is drawn underneath because the points alone would
 * only be a round scatter. Here there is no wire and no guide. Each ring is a
 * broken chain of straight chords — true chords, with their midpoints pulled in
 * by `cos(span)` exactly as an inscribed line is — each one nudged off its
 * radius and rotated a little off tangent, so the curve is *implied by* a
 * sequence of straight marks and never drawn.
 *
 * That is the whole reason the errors are sampled rather than animated. A ring
 * of perfect chords is just a polygon, and a polygon reads as a shape someone
 * drew; a ring of chords that each miss by a different amount reads as a
 * construction, because the eye recovers the circle from marks that disagree
 * about where it is. The disagreement has to be fixed and per-segment for that
 * to work — a wobble applied evenly to all of them would move the polygon, not
 * loosen it.
 *
 * Motion is a slow signed spin per ring, over which each chord slips along its
 * own arc and tilts. Because a chord slides further than its own length
 * (`SLIP`), the gaps travel around the ring independently of the ring's
 * rotation, and the chain visibly comes apart and closes up again without any
 * mark ever appearing or disappearing.
 */

export default defineGenerator<Ring[]>({
  name: 'line-circles',
  label: 'Line Circles',
  description:
    'Rings deconstructed into loose tangential segments rather than beads.',
  group: 'radial',
  // Radial forms need a pace of their own: tangential speed is `omega · r`, so
  // a turn that is stately on a small form is a blur at full reach. A little
  // slower than the parent, because a straight mark shows its own motion more
  // plainly than a dot does — a dot moving is a dot, a line moving is a line
  // sweeping.
  speed: 0.4,
  defaults: { density: 0.5, strokeWidth: 1.6 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const rings = Math.round(lerp(5, 11, p.density));
    const out: Ring[] = [];
    for (let i = 0; i < rings; i++) {
      const rFrac = 0.18 + (i / Math.max(1, rings - 1)) * 0.78;
      // Segments in proportion to circumference, so the chord length stays
      // roughly constant across the rings. Scaling the *count* rather than the
      // length is what keeps the marks reading as one alphabet: an outer ring
      // with the same segment count would be drawn in strokes twice as long,
      // and the two rings would look like different generators.
      const count = Math.max(
        4,
        Math.round(lerp(7, 17, p.density) * (0.35 + rFrac)),
      );
      const segments: Segment[] = [];
      for (let j = 0; j < count; j++) {
        // Half the arc *available* to this segment, times a gap factor well
        // under 1. The leftover is the break in the chain, and varying it per
        // segment is what stops the ring reading as a dash pattern.
        const slot = Math.PI / count;
        segments.push({
          angle: (j / count) * TAU + range(rng, -0.28, 0.28) * slot,
          span: slot * range(rng, 0.4, 0.82),
          off: range(rng, -1, 1) * DRIFT,
          tilt: range(rng, -0.2, 0.2),
          phase: range(rng, 0, TAU),
          hot: chance(rng, 0.16),
        });
      }
      out.push({
        r: rFrac,
        // One turn per loop at most, alternating direction. A partial turn is
        // not available — it does not close — so slower means a smaller
        // `cycles()` ceiling, never a fraction of one.
        spin: cycles(rng(), 1) * (i % 2 ? -1 : 1),
        beat: cycles(rng(), 3),
        segments,
      });
    }
    return out;
  },

  project: (rings, p, t) => {
    // A parameter, not `width / 2`: the radial family exists so a background
    // can sit behind a title, which needs the rings pushed off the side the
    // words are on.
    const [cx, cy] = centre(p);
    const reach = Math.min(p.width, p.height) * 0.46;
    const gap = reach / Math.max(1, rings.length);
    let out = '';
    for (const ring of rings) {
      // Ramp position is the ring's normalised radius — the axis this form is
      // already about, and the only ordered property it has. The innermost ring
      // takes one end of the ramp and the outermost the other, so the
      // concentric structure survives even where the chords are too broken to
      // trace, which is the failure mode a deconstructed ring risks.
      const stroke = ink(p, ring.r, 0.34);
      const hotStroke = ink(p, ring.r, 0.92);
      const base = ring.r * reach;
      const spin = t * TAU * ring.spin;
      for (const s of ring.segments) {
        // The chord slides along its own arc. `wobble` is zero at both ends of
        // the loop, so the still frame is the sampled construction and the
        // slipping is something that happens to it.
        const a =
          s.angle + spin + s.span * SLIP * wobble(t, ring.beat, s.phase);
        const rad =
          base +
          gap * s.off +
          gap * DRIFT * 0.5 * wobble(t, ring.beat, s.phase + 1.7);
        const tilt = s.tilt + TILT_SWING * wobble(t, ring.beat, s.phase + 2.4);
        // A true chord: the midpoint sits at `rad · cos(span)` and the
        // half-length is `rad · sin(span)`. Drawing it as a tangent instead
        // would push every stroke outside its ring, and a stack of rings drawn
        // that way grows visibly fatter toward the centre.
        const mx = cx + Math.cos(a) * rad * Math.cos(s.span);
        const my = cy + Math.sin(a) * rad * Math.cos(s.span);
        const half = rad * Math.sin(s.span);
        const dir = a + Math.PI / 2 + tilt;
        const dx = Math.cos(dir) * half;
        const dy = Math.sin(dir) * half;
        out += `<line x1="${r2(mx - dx)}" y1="${r2(my - dy)}" x2="${r2(mx + dx)}" y2="${r2(my + dy)}" stroke="${s.hot ? hotStroke : stroke}" stroke-width="${r2(p.strokeWidth * (s.hot ? 1.5 : 0.9))}" stroke-linecap="round"/>`;
      }
    }
    return frame(p, out);
  },
});
