import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  chance,
  cycles,
  frame,
  lattice,
  lerp,
  mulberry32,
  r2,
  range,
  TAU,
  withAlpha,
} from './shared';

/* ── flow-lines ───────────────────────────────────────────────────────────── */

interface Streamline {
  /** Points integrated once, in `sample`, where there is no `t` to destabilise. */
  points: [number, number][];
  hot: boolean;
  phase: number;
  drift: number;
}

/** Sections a streamline is cut into. Fixed, so the mark count cannot vary. */
const LINE_SECTIONS = 7;

/** Integration step, as a fraction of the smaller frame dimension. */
const LINE_STEP = 0.014;

/** Hard cap on steps in one direction, so a closed orbit cannot spin forever. */
const LINE_MAX_STEPS = 90;

/**
 * Evenly spaced streamlines, cut into sections that grow and shrink into
 * each other.
 *
 * ## Even spacing is most of the look
 *
 * The reference draws 148 paths of between 2 and 62 points each — uniform
 * stroke, no colour variation, nothing clever in the rendering. All of its
 * quality is in *placement*: lines are seeded, integrated, and stopped as soon
 * as they come within a separation distance of a line already drawn. That is
 * Jobard and Lefebvre's algorithm, and it is what produces the combed
 * appearance, with long sweeps through open field and short stubs where the
 * flow crowds.
 *
 * The first version here seeded at random and clumped, which no amount of
 * per-line styling fixes — random points in a plane are not evenly spaced, they
 * are Poisson, and Poisson looks lumpy. So this keeps an occupancy grid and
 * refuses to draw where it is already dense. Line *lengths* then vary on their
 * own, which is the thing that made the reference look considered.
 *
 * ## Sections, and why the geometry still never advects
 *
 * Integration lives in `sample`, for the reason `flow-field` documents at
 * length: advecting per frame compounds error and the tail switches channel
 * rather than drifting.
 *
 * `project` cuts each finished curve into sections and contracts each one
 * toward its own start by a travelling factor. A section at full extent meets
 * the next and the line reads as continuous; at low extent it is a short dash
 * with a gap either side. Since the factor travels along the line, sections
 * grow into their neighbours and shrink away from them in sequence, which is
 * the flow — carried entirely by *extent*, while every underlying point stays
 * where `sample` put it.
 *
 * Contraction interpolates along the curve rather than dropping points, so a
 * section emits the same number of coordinates at every `t`. Dropping them
 * would change the mark count with the frame, which is the confetti failure.
 */

export default defineGenerator<Streamline[]>({
  name: 'flow-lines',
  label: 'Flow Lines',
  description:
    'Long streamlines with a pulse running along them — traced once, lit per frame.',
  group: 'field',
  defaults: { density: 0.5, strokeWidth: 2 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const a = range(rng, 1.1, 2.2);
    const b = range(rng, 1.1, 2.2);
    const step = Math.min(p.width, p.height) * LINE_STEP;
    // Separation, and therefore how many lines fit. Denser packing means more,
    // shorter lines — the two move together, as they do in the reference.
    const sep = lerp(46, 15, p.density);
    const cell = sep;
    const cols = Math.ceil(p.width / cell) + 4;
    const rows = Math.ceil(p.height / cell) + 4;
    // Occupancy grid, offset by two cells so out-of-frame bleed still indexes.
    const grid: [number, number][][] = Array.from(
      { length: cols * rows },
      () => [],
    );
    const idx = (x: number, y: number) =>
      Math.floor(y / cell + 2) * cols + Math.floor(x / cell + 2);
    const tooClose = (x: number, y: number, d: number): boolean => {
      const cx = Math.floor(x / cell + 2);
      const cy = Math.floor(y / cell + 2);
      for (let j = cy - 1; j <= cy + 1; j++) {
        for (let i = cx - 1; i <= cx + 1; i++) {
          if (i < 0 || j < 0 || i >= cols || j >= rows) continue;
          for (const [px, py] of grid[j * cols + i]) {
            if ((px - x) ** 2 + (py - y) ** 2 < d * d) return true;
          }
        }
      }
      return false;
    };
    const angleAt = (x: number, y: number) =>
      Math.sin((x / p.width) * a * TAU) * 1.35 +
      Math.cos((y / p.height) * b * TAU) * 1.35;

    /** Walk the field from a point, stopping at the frame or at a neighbour. */
    const trace = (sx: number, sy: number, dir: number): [number, number][] => {
      const pts: [number, number][] = [];
      let x = sx;
      let y = sy;
      for (let k = 0; k < LINE_MAX_STEPS; k++) {
        const ang = angleAt(x, y);
        x += Math.cos(ang) * step * dir;
        y += Math.sin(ang) * step * dir;
        if (x < -sep || y < -sep || x > p.width + sep || y > p.height + sep) {
          break;
        }
        // Half the separation while growing, so a line may approach another
        // more closely than seeds are allowed to — otherwise every line stops
        // almost immediately and the field is all stubs.
        if (tooClose(x, y, sep * 0.5)) break;
        pts.push([x, y]);
      }
      return pts;
    };

    // Seeds on a jittered lattice rather than at random: the grid gives even
    // coverage, the jitter stops the lines starting in visible rows.
    const lines: Streamline[] = [];
    const gap = sep * 1.6;
    for (let sy = gap / 2; sy < p.height; sy += gap) {
      for (let sx = gap / 2; sx < p.width; sx += gap) {
        const jx = sx + range(rng, -gap / 3, gap / 3);
        const jy = sy + range(rng, -gap / 3, gap / 3);
        const hot = chance(rng, 0.12);
        const drift = range(rng, 0.5, 1);
        const phase = range(rng, 0, TAU);
        if (tooClose(jx, jy, sep)) continue;
        const back = trace(jx, jy, -1).reverse();
        const fwd = trace(jx, jy, 1);
        const pts: [number, number][] = [...back, [jx, jy], ...fwd];
        // Two points cannot be cut into sections, and a three-point stub is not
        // worth the marks.
        if (pts.length < LINE_SECTIONS + 1) continue;
        for (const q of pts) grid[idx(q[0], q[1])]?.push(q);
        lines.push({ points: pts, hot, phase, drift });
      }
    }
    return lines;
  },
  project: (lines, p, t) => {
    let out = '';
    for (const line of lines) {
      const pts = line.points;
      const per = (pts.length - 1) / LINE_SECTIONS;
      /** Position at a fractional index along the curve. */
      const at = (f: number): [number, number] => {
        const i = Math.min(pts.length - 1, Math.max(0, f));
        const lo = Math.floor(i);
        const hi = Math.min(pts.length - 1, lo + 1);
        const m = i - lo;
        return [
          pts[lo][0] + (pts[hi][0] - pts[lo][0]) * m,
          pts[lo][1] + (pts[hi][1] - pts[lo][1]) * m,
        ];
      };
      for (let sIdx = 0; sIdx < LINE_SECTIONS; sIdx++) {
        const from = sIdx * per;
        // Extent, travelling along the line. Whole cycles per loop, so it
        // closes; the section index sets where it is, so growth runs from head
        // to tail rather than every section pulsing together.
        const wave = (Math.sin(sIdx * 1.1 - t * TAU * 2 + line.phase) + 1) / 2;
        const extent = 0.25 + 0.75 * wave;
        let d = '';
        const steps = Math.max(2, Math.round(per));
        for (let i = 0; i <= steps; i++) {
          const [x, y] = at(from + (i / steps) * per * extent);
          d += `${i === 0 ? 'M' : 'L'}${r2(x)} ${r2(y)}`;
        }
        // Thin as it shrinks, so a contracting section fades out of the line
        // instead of ending as a stub of full weight.
        const w =
          p.strokeWidth * (line.hot ? 1.7 : 0.9) * (0.45 + 0.55 * extent);
        const alpha =
          (line.hot ? 0.4 : 0.18) + extent * (line.hot ? 0.55 : 0.4);
        out += `<path d="${d}" fill="none" stroke="${withAlpha(p.accent, r2(alpha))}" stroke-width="${r2(w)}" stroke-linecap="round"/>`;
      }
    }
    return frame(p, out);
  },
});
