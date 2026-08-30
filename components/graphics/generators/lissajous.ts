import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  lerp,
  mulberry32,
  pick,
  r2,
  range,
  TAU,
  withAlpha,
} from './shared';

/* ── lissajous ────────────────────────────────────────────────────────────── */

interface Figure {
  cx: number;
  cy: number;
  /** Half-width and half-height of the box the figure is drawn inside. */
  ax: number;
  ay: number;
  /** The frequency pair. Integers, which is the whole point — see below. */
  a: number;
  b: number;
  /** Starting phase offset between the two axes. */
  delta: number;
  /** Whole cycles of `delta` per loop, signed. */
  spin: number;
  hot: boolean;
}

/**
 * Integer frequency pairs, kept coprime so the figure uses its whole box.
 *
 * A shared factor is not a new figure: `4:6` traces exactly the `2:3` curve,
 * just twice as fast round it, so the table would silently contain duplicates
 * with the same character and none of the variety it exists to supply. Both
 * orderings of a pair are listed because they are genuinely different shapes —
 * `3:2` is `2:3` on its side, and a field of one orientation reads as a grid.
 */
const RATIOS: readonly (readonly [number, number])[] = [
  [1, 2],
  [2, 1],
  [2, 3],
  [3, 2],
  [3, 4],
  [4, 3],
  [1, 3],
  [3, 1],
  [4, 5],
  [5, 4],
  [2, 5],
  [5, 6],
];

/**
 * Points per figure. Fixed, and deliberately not derived from the frequencies.
 *
 * A denser curve wants more points, so tying the count to `a + b` is the
 * obvious move — and it would emit a different number of coordinates per
 * figure, which is fine, and tempt the same trick at project time, which is
 * not: the mark-count test reads every number in the SVG and requires the count
 * identical at every `t`. One constant for every figure removes the temptation
 * entirely, and 240 resolves the busiest pair in the table.
 */
const SAMPLES = 240;

/**
 * A field of Lissajous figures — `x = A sin(a·u + δ)`, `y = B sin(b·u)`.
 *
 * Every other generator here closes its loop by *construction*: `cycles()`
 * refuses to return a float, so each motion term is a whole number of turns and
 * `t = 1` lands back on `t = 0`. This one is worth having because the figure
 * already has that property in its own geometry. With `a` and `b` integers the
 * curve is periodic in `u` with period `2π` — it returns to its start and
 * closes on itself natively, with nothing enforcing it. `cycles()` is the same
 * idea applied by hand to a term that has no such structure of its own.
 *
 * So the sampled ratios are integers for the shape's sake, and the animation is
 * still `cycles()` for the loop's sake, and the two are the same argument at
 * different scales. If the ratio were irrational the curve would never close
 * and would fill its box as a solid smear — which is also what a fractional
 * cycle count does to a loop, spread over ten seconds instead of one frame.
 *
 * The motion advances `δ` — the phase *between* the axes, not a rotation. A
 * Lissajous figure with a moving δ appears to turn in depth and fold through
 * itself, collapsing to a line as the axes come into phase and opening back
 * out, which no rigid transform of a static curve can imitate.
 */
export default defineGenerator<Figure[]>({
  name: 'lissajous',
  label: 'Lissajous',
  description:
    'A field of Lissajous curves; integer frequency ratios close the loop natively.',
  group: 'field',
  defaults: { density: 0.55, strokeWidth: 1.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const cols = Math.round(lerp(2, 4, p.density));
    const rows = Math.round(lerp(2, 3, p.density));
    const cellW = p.width / cols;
    const cellH = p.height / rows;
    // Reach is measured against the frame, not the cell.
    //
    // Sizing each figure to its own cell and nudging it by a tenth produced a
    // contact sheet: every curve sat inside an invisible box the eye found
    // anyway, and the whole thing read as a chart of specimens rather than a
    // composition. The grid survives only as a coverage device now — figures
    // are placed from it, then jittered by almost half a cell and scaled
    // against the short side of the frame, so a large one spans several cells,
    // overlaps its neighbours and runs off the edge.
    const reach = Math.min(p.width, p.height);
    const figures: Figure[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const [a, b] = pick(rng, RATIOS);
        // A wide range, weighted small: mostly modest figures with the
        // occasional one big enough to be the subject. Squared, so large ones
        // stay rare enough to read as an accent rather than as clutter.
        const roll = rng();
        const scale = 0.1 + 0.42 * roll * roll;
        figures.push({
          cx: (col + 0.5) * cellW + range(rng, -0.45, 0.45) * cellW,
          cy: (row + 0.5) * cellH + range(rng, -0.45, 0.45) * cellH,
          // Axes differ per figure, so they are not all the same aspect.
          ax: reach * scale * range(rng, 0.85, 1.35),
          ay: reach * scale * range(rng, 0.85, 1.35),
          a,
          b,
          delta: range(rng, 0, TAU),
          // Derived from a draw rather than from `a` or `b`, so the rate is
          // independent of the shape — tying them would make every 3:2 in the
          // field turn in lockstep, and the parallax between figures is what
          // stops the whole thing pulsing as one object.
          spin: cycles(rng(), 2) * (chance(rng, 0.5) ? 1 : -1),
          hot: chance(rng, 0.22),
        });
      }
    }
    return figures;
  },
  project: (figures, p, t) => {
    const faint = withAlpha(p.accent, 0.34);
    const bright = withAlpha(p.accent, 0.92);
    let out = '';
    for (const f of figures) {
      // A travelling phase, not a wobble. `wobble` would swing δ out and back
      // along the same path, so the figure would fold one way and unfold
      // through the identical frames in reverse — visibly a palindrome. A whole
      // number of complete cycles keeps it turning in one direction and still
      // lands on `sin(δ)` at `t = 1`.
      const delta = f.delta + t * TAU * f.spin;
      let d = '';
      // `i < SAMPLES`, then `Z`: the point at `u = 2π` *is* the point at
      // `u = 0` for integer frequencies, so emitting it would repeat a
      // coordinate the close already supplies.
      for (let i = 0; i < SAMPLES; i++) {
        const u = (i / SAMPLES) * TAU;
        const x = f.cx + f.ax * Math.sin(f.a * u + delta);
        const y = f.cy + f.ay * Math.sin(f.b * u);
        d += `${i === 0 ? 'M' : 'L'}${r2(x)} ${r2(y)} `;
      }
      out += `<path d="${d.trim()}Z" fill="none" stroke="${f.hot ? bright : faint}" stroke-width="${r2(p.strokeWidth * (f.hot ? 1.6 : 1))}"/>`;
    }
    return frame(p, out);
  },
});
