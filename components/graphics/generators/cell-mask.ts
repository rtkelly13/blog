import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
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

/* ── cell-mask ────────────────────────────────────────────────────────────── */

interface Mark {
  /** Top-left of the cell that does the clipping, and its size. */
  cx: number;
  cy: number;
  cw: number;
  ch: number;
  /** Top-left of the mark, which is larger than the cell and hangs out of it. */
  mx: number;
  my: number;
  size: number;
  /** 1 for a disc, 0 for a square — see the corner-radius note in `project`. */
  round: number;
  roll: number;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), hi);

/** Grid of oversized marks, each showing only the part inside its own cell. */

export default defineGenerator<Mark[]>({
  name: 'cell-mask',
  label: 'Cell Mask',
  description:
    'Grid of windows, each showing the fragment of an oversized disc or square that falls inside it.',
  group: 'lattice',
  defaults: { density: 0.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const spacing = lerp(128, 54, p.density);
    // A gutter, so the windows read as separate glimpses rather than as one
    // mosaic. Without it neighbouring fragments touch along the cell edges and
    // the eye joins them into continuous shapes, which is the opposite of the
    // effect: the point is that each cell is a window onto its own mark.
    const gutter = spacing * 0.14;
    const cw = spacing - gutter;
    const marks: Mark[] = [];
    for (let cy = 0; cy < p.height; cy += spacing) {
      for (let cx = 0; cx < p.width; cx += spacing) {
        // Bigger than the cell by construction — that is what guarantees the
        // clip has something to cut, whatever else is sampled. Only a little
        // bigger, though: the fragment has to look like a piece of a shape at
        // *this* scale, and a mark four cells wide clips to a flat edge with no
        // curvature left in it at all.
        const size = cw * range(rng, 1.15, 1.9);
        // The mark is placed by choosing the fragment we want and solving for
        // the mark, rather than by offsetting the mark and hoping. Offsetting
        // blindly leaves a scatter of cells fully covered and a scatter empty;
        // anchoring one mark edge inside the cell means every cell shows a
        // fragment of a known size, flush against the opposite cell edge.
        //
        // Mostly *small* fractions, and that is the whole legibility argument:
        // a cell filled edge to edge is indistinguishable from a cell that was
        // never clipped, so a grid of full cells reads as a colour-block quilt.
        // A small fragment pinned into a corner of its window, with cell
        // background around it, can only be a piece of something larger. The
        // occasional near-full reveal is an accent, not the rule.
        const revealX = chance(rng, 0.12)
          ? range(rng, 0.7, 1)
          : range(rng, 0.3, 0.68);
        const revealY = chance(rng, 0.12)
          ? range(rng, 0.7, 1)
          : range(rng, 0.3, 0.68);
        const fromLeft = chance(rng, 0.5);
        const fromTop = chance(rng, 0.5);
        marks.push({
          cx,
          cy,
          cw,
          ch: cw,
          mx: fromLeft ? cx + cw * revealX - size : cx + cw * (1 - revealX),
          my: fromTop ? cy + cw * revealY - size : cy + cw * (1 - revealY),
          size,
          // Discs dominate. A clipped rectangle is just a smaller rectangle —
          // the cut leaves no trace — whereas a clipped disc keeps its curve on
          // the edges the cell did not touch, so the eye completes the circle
          // beyond the window. Squares are the minority note that keeps the
          // grid from reading as a dot screen.
          round: chance(rng, 0.8) ? 1 : 0,
          roll: rng(),
        });
      }
    }
    return marks;
  },
  project: (marks, p, t) => {
    // Backgrounds sit behind text, so the ink is thin: one bright accent per
    // dozen cells and everything else barely there. An earlier pass ran these
    // at 0.9/0.3 with near-full coverage and it competed with the page rather
    // than sitting under it.
    //
    // Position on the ramp is where the cell sits across the frame, taken down
    // the diagonal so neither axis is privileged. The window and the fragment
    // inside it share it, which is the point: the grid is the constant here,
    // and a cell whose frame and fragment drift apart in hue would read as two
    // overlaid lattices rather than as one ramped field. The fragment's reveal
    // fraction was the alternative and it has no counterpart on the frame.

    // Recomputed rather than stored: it is a pure function of `density`, which
    // `project` already has, and duplicating it into every mark would be the
    // same number written a few hundred times into the sampled structure.
    const spacing = lerp(128, 54, p.density);
    const drift = spacing * 0.3;
    let out = '';
    for (const m of marks) {
      const pos = (m.cx + m.cy) / (p.width + p.height);
      const bright = ink(p, pos, 0.55);
      const faint = ink(p, pos, 0.16);
      const outline = ink(p, pos, 0.32);
      // The window itself. It is what makes the clip *readable*: a fragment on
      // its own is a shape that happens to be that size, whereas a fragment sat
      // flush inside a visible frame is a shape that carries on past it. It also
      // carries the composition — the grid is the constant, and the fragments are
      // free to be sparse because the frames are already holding the rhythm.
      const cell = ink(p, pos, 0.1);
      const k = cycles(m.size, 3);
      const phase = m.roll * TAU;
      // The mark wanders inside — and out of — its cell, so the window shows a
      // different part of it as the loop runs. Nothing about the cell moves:
      // the grid is the fixed thing and the shapes slide behind it, which is
      // what makes the clipping legible instead of looking like marks that
      // happen to change size.
      const mx = m.mx + drift * wobble(t, k, phase);
      const my = m.my + drift * wobble(t, k, phase + Math.PI / 2);
      // The clip, done as arithmetic: intersect the mark's rect with the
      // cell's and emit the result. A `<clipPath>` per cell would render the
      // same thing while tripling the element count and making "how many marks
      // is this" a question about defs rather than about the composition.
      //
      // Clamping both edges into the cell — rather than taking max/min of the
      // raw edges — is what keeps this branch-free. A mark entirely past the
      // cell collapses to a zero-area fragment on the cell edge, so it is still
      // one element with the same numbers in it; omitting it instead would
      // change the emitted count mid-loop, which is exactly the failure the
      // suite calls confetti.
      const x0 = clamp(mx, m.cx, m.cx + m.cw);
      const x1 = clamp(mx + m.size, m.cx, m.cx + m.cw);
      const y0 = clamp(my, m.cy, m.cy + m.ch);
      const y1 = clamp(my + m.size, m.cy, m.cy + m.ch);
      const w = x1 - x0;
      const h = y1 - y0;
      // How much of the mark each side lost to the cell. These are what turn
      // the intersection *rectangle* back into something that looks like a
      // clipped disc: a corner keeps the disc's curvature only while neither
      // edge meeting there has been cut back to the centre, and goes square
      // once it has. Cut the left off a circle past its middle and you get a D;
      // cut the left and the top off and you get the quarter that survives in
      // the corner of the window. Both fall out of one expression.
      //
      // Emitting per-corner radii on a path rather than a single `rx` on a rect
      // is the one departure from "emit the intersection rect", and it is the
      // difference between a fragment that reads as clipped and a rounded
      // rectangle that reads as a small blob. The true circle-in-rectangle
      // boundary is not drawable at a fixed cost — it is arcs and chords in a
      // count that depends on how many cell edges were crossed, i.e. a mark
      // count that varies with `t`, the one thing that cannot happen here. This
      // path is always the same ten commands and the same numbers, whatever the
      // cell cut.
      const cutL = x0 - mx;
      const cutR = mx + m.size - x1;
      const cutT = y0 - my;
      const cutB = my + m.size - y1;
      const full = (m.round * m.size) / 2;
      const cap = Math.min(w, h) / 2;
      const rTL = clamp(full - Math.max(cutL, cutT), 0, cap);
      const rTR = clamp(full - Math.max(cutR, cutT), 0, cap);
      const rBR = clamp(full - Math.max(cutR, cutB), 0, cap);
      const rBL = clamp(full - Math.max(cutL, cutB), 0, cap);
      const style =
        m.roll < 0.09
          ? `fill="${bright}"`
          : m.roll < 0.62
            ? `fill="${faint}"`
            : `fill="none" stroke="${outline}" stroke-width="${p.strokeWidth}"`;
      out += `<rect x="${r2(m.cx)}" y="${r2(m.cy)}" width="${r2(m.cw)}" height="${r2(m.ch)}" fill="none" stroke="${cell}" stroke-width="1"/>`;
      out += `<path d="M${r2(x0 + rTL)} ${r2(y0)}L${r2(x1 - rTR)} ${r2(y0)}A${r2(rTR)} ${r2(rTR)} 0 0 1 ${r2(x1)} ${r2(y0 + rTR)}L${r2(x1)} ${r2(y1 - rBR)}A${r2(rBR)} ${r2(rBR)} 0 0 1 ${r2(x1 - rBR)} ${r2(y1)}L${r2(x0 + rBL)} ${r2(y1)}A${r2(rBL)} ${r2(rBL)} 0 0 1 ${r2(x0)} ${r2(y1 - rBL)}L${r2(x0)} ${r2(y0 + rTL)}A${r2(rTL)} ${r2(rTL)} 0 0 1 ${r2(x0 + rTL)} ${r2(y0)}Z" ${style}/>`;
    }
    return frame(p, out);
  },
});
