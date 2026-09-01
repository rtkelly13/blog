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

/* ── spiral-dots ──────────────────────────────────────────────────────────── */

/**
 * The golden angle, in radians. 137.507° — the placement rule, not a look.
 *
 * Written out rather than derived from φ for the same reason as in
 * `phyllotaxis`: the number is the subject. A tenth of a degree either way and
 * the arms unwind into radial spokes, which is the quickest demonstration that
 * the packing is doing something no other angle does.
 */
const GOLDEN_ANGLE = (137.507 * Math.PI) / 180;

/**
 * Candidate parastichy orders — the Fibonacci numbers.
 *
 * A seed head's arms are not drawn; they are the *nearest-neighbour* chains,
 * and a chain steps by a Fibonacci number of placements. Which one is nearest
 * changes with radius, which is why a sunflower shows 21 arms near the middle
 * and 34 further out. Picking the minimising `k` per mark reproduces that
 * transition for free.
 */
const PARASTICHIES = [5, 8, 13, 21, 34];

/** One mark: where it sits, which way its chain runs, and how far along it. */
interface Dot {
  /** Distance from the centre, in frame units. */
  r: number;
  /** Angle before the head's rotation. */
  ang: number;
  /** Fraction of the way out, 0 at the centre and 1 at the rim. */
  u: number;
  /** Direction to the nearest Fibonacci neighbour, before rotation. */
  dir: number;
  /** Distance to it — the local packing pitch, and the unit every size is in. */
  pitch: number;
  /** Alpha at rest, before contrast. */
  alpha: number;
}

interface Field {
  dots: Dot[];
  /** Whole cycles per loop of the wave travelling out through the arms. */
  waveCycles: number;
  /** Whole cycles per loop of the radial breathing. */
  breathe: number;
}

/** Whole turns per loop. Consumed by `cos`/`sin`, never printed as `rotate()`. */
const SPIN = 1;

/**
 * Crests between the centre and the rim. Two is enough to be a wave rather
 * than a pulse, and few enough that a crest is wider than the gap between arms
 * — a wave finer than the packing reads as noise on it, not as travel through
 * it.
 */
const WAVE_CRESTS = 2;

/**
 * Mark length as a fraction of the local pitch, at the centre and at the rim.
 *
 * 1 means a mark exactly reaches its neighbour's centre, so a chain of them is
 * continuous. The rim sits just under that and the centre at half, which is why
 * the arms tighten into ribbons outward while the middle stays a scatter of
 * separate marks.
 */
const MARK_MIN = 0.52;
const MARK_MAX = 0.98;

/**
 * Width as a fraction of length. A half is the whole argument of this
 * generator, and it is a two-sided constraint rather than a taste: *along* the
 * chain the marks have to close up, and *across* it they must not. Round it up
 * toward 1 and the marks are discs again, which chain in no direction; flatten
 * it below about a third and they are the parent's dashes.
 */
const MARK_ASPECT = 0.5;

/**
 * Golden-angle placement, read as spiral arms made of rounded marks.
 *
 * A variant of `phyllotaxis`, and the difference is what the arms are made of.
 * The parent draws a hairline dash per mark, cut to about the gap between
 * neighbours, and puts three thousand of them down: the chains are half-drawn
 * and the eye joins them into a dense engraved fabric. This one is a quarter
 * the count, and every mark is a fat rounded lozenge that runs from one
 * neighbour nearly to the next, so an arm is a continuous swelling ribbon
 * rather than a dashed line. Fine texture against bold ribbons — the same
 * placement rule read at two completely different weights.
 *
 * ## Why round dots could not do it, which took a render to accept
 *
 * The first two passes were true circles, on the theory that the packing alone
 * would produce the arms. It does not, and the reason is worth stating: a
 * golden-angle packing is very nearly *isotropic*. Each mark has five or six
 * neighbours at almost the same distance, spread evenly about it, so a disc
 * leaves the same gap in every direction and there is nothing for the eye to
 * chain along. Enlarging the discs — the second pass — only closes every gap at
 * once, which is exactly a halftone screen, and screens produce moiré rather
 * than arms.
 *
 * Arms come from *anisotropy in the gaps*, not from the placement. The mark has
 * to be longer along its own parastichy than across it, so the along-chain gaps
 * close while the cross-chain ones stay open. `MARK_ASPECT` is that ratio and
 * it is the whole generator; the direction it is measured in is the one the
 * parent already computes.
 *
 * ## Everything is measured in pitch
 *
 * Sizes are fractions of the local packing pitch rather than of the frame, so
 * the chaining survives a density change: more marks means a smaller pitch
 * means smaller marks, and the gaps stay in proportion. Sizing in pixels made
 * the marks merge into a disc at high density and scatter into a screen at low.
 *
 * Motion is a whole revolution per loop, consumed by `cos`/`sin` rather than
 * printed as a `rotate()`, since a printed `360` differs textually from `0` and
 * would break loop closure. Over it a wave travels outward, lengthening the
 * marks as it passes so the ribbons visibly knit together and open again, and
 * the whole field breathes a few per cent in and out.
 */

export default defineGenerator<Field>({
  name: 'spiral-dots',
  label: 'Spiral Dots',
  description:
    'Golden-angle placement drawn as dots on visible spiral arms rather than as dashes.',
  group: 'radial',
  sketch: true,
  // Radial forms need a pace of their own: tangential speed is `omega · r`, so
  // one turn per loop at full reach is a blur unless the loop is stretched.
  // Slower than the parent's, because a sparse field gives the eye individual
  // marks to track and a dense one does not.
  speed: 0.35,
  defaults: { density: 0.5, strokeWidth: 2 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const [cx, cy] = centre(p);
    // Distance to the furthest corner *from the chosen origin*, so the field
    // still reaches past every corner once the centre has been moved off the
    // middle. Taking half the diagonal instead would leave a bald quadrant the
    // moment `originX` moved, which is exactly the case the parameter exists
    // for.
    const reach = Math.max(
      Math.hypot(cx, cy),
      Math.hypot(p.width - cx, cy),
      Math.hypot(cx, p.height - cy),
      Math.hypot(p.width - cx, p.height - cy),
    );
    // A quarter of the parent's, and the sparseness is not a separate taste
    // from the mark size — it is what buys the room for a mark to be half as
    // wide as it is long and still have a gap on either side of it. Pack this
    // as tightly as the parent and the ribbons weld into a solid disc.
    const count = Math.round(lerp(320, 760, p.density));
    // The head's own orientation, and the only thing the seed may move about
    // the placement. Jittering the positions would vandalise the one property
    // worth drawing.
    const phase = range(rng, 0, TAU);
    // `√(count − 1)` normalises the last mark onto the rim, so density changes
    // how many marks there are rather than how big the field is.
    const scale = reach / Math.sqrt(Math.max(1, count - 1));

    // Placements are needed one parastichy beyond the last drawn mark, so the
    // outermost marks have a neighbour to point at.
    const look = PARASTICHIES[PARASTICHIES.length - 1];
    const px: number[] = [];
    const py: number[] = [];
    for (let i = 0; i < count + look; i++) {
      const r = scale * Math.sqrt(i);
      const a = i * GOLDEN_ANGLE + phase;
      px.push(Math.cos(a) * r);
      py.push(Math.sin(a) * r);
    }

    const dots: Dot[] = [];
    for (let i = 0; i < count; i++) {
      let k = PARASTICHIES[0];
      let best = Infinity;
      for (const cand of PARASTICHIES) {
        const d = Math.hypot(px[i + cand] - px[i], py[i + cand] - py[i]);
        if (d < best) {
          best = d;
          k = cand;
        }
      }
      const r = scale * Math.sqrt(i);
      const u = r / reach;
      dots.push({
        r,
        ang: i * GOLDEN_ANGLE + phase,
        u,
        dir: Math.atan2(py[i + k] - py[i], px[i + k] - px[i]),
        pitch: best,
        // Fading outward against the growth. The outer marks are several times
        // the area of the inner ones, so at equal alpha they would carry all
        // the weight and the field would read as a ring. The small roll on top
        // gives the ribbons grain, so an arm is a chain of individual marks
        // rather than a stroke.
        alpha: r2(lerp(0.92, 0.46, u) * range(rng, 0.82, 1)),
      });
    }

    return {
      dots,
      waveCycles: cycles(rng(), 3),
      breathe: cycles(rng(), 2),
    };
  },

  project: (f, p, t) => {
    // A parameter, not `width / 2`: the radial family exists so a background
    // can sit behind a title, and `reach` above is measured from this point so
    // the field stays full-bleed wherever it is put.
    const [cx, cy] = centre(p);
    const rot = t * TAU * SPIN;
    let out = '';
    for (const d of f.dots) {
      const a = d.ang + rot;
      // Crests travelling outward. Not written through `wobble`, because this
      // one is allowed to be non-zero at `t = 0` — it is a standing pattern in
      // radius that happens to travel, and the still frame wants it. Loop
      // closure comes from `waveCycles` being whole.
      const wave = Math.sin(d.u * TAU * WAVE_CRESTS - t * TAU * f.waveCycles);
      // Radial breathing, small and zero at both ends of the loop. Enough that
      // the arms visibly flex; any more and the packing pumps like a bellows,
      // which is the one thing a regular field must not do.
      const r = d.r * (1 + 0.045 * wobble(t, f.breathe, d.u * TAU));
      // The wave knits the arms together and lets them open, by lengthening the
      // marks rather than by brightening them: driving alpha with it sweeps a
      // dark band across the frame that reads as a rendering fault, which is
      // the trap the parent documents.
      const len =
        d.pitch * lerp(MARK_MIN, MARK_MAX, d.u ** 0.8) * (1 + 0.16 * wave);
      const width = len * MARK_ASPECT;
      // Drawn as a round-capped stroke, so the mark is a capsule: the caps
      // account for `width` of the total length, and the line itself for the
      // rest. Subtracting it is what keeps the *outside* of the mark reaching
      // its neighbour — without it a fat mark overshoots by its own radius at
      // each end and the arms weld shut.
      const half = Math.max(0.01, (len - width) / 2);
      const mx = cx + Math.cos(a) * r;
      const my = cy + Math.sin(a) * r;
      // The long axis lies along the chain, which is the only thing that makes
      // an arm rather than a screen. `dir` is stored before rotation, so the
      // head's spin has to be added here alongside it.
      const dx = Math.cos(d.dir + rot) * half;
      const dy = Math.sin(d.dir + rot) * half;
      // Ramp position is the mark's own normalised radius. Unlike the parent —
      // which batches its marks into paths and can therefore only colour a
      // whole band at once — every mark here is its own element, so the ramp is
      // sampled per mark and runs continuously from the centre to the rim.
      out += `<line x1="${r2(mx - dx)}" y1="${r2(my - dy)}" x2="${r2(mx + dx)}" y2="${r2(my + dy)}" stroke="${ink(p, d.u, d.alpha)}" stroke-width="${r2(width)}" stroke-linecap="round"/>`;
    }
    return frame(p, out);
  },
});
