import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  cycles,
  frame,
  ink,
  lerp,
  mulberry32,
  r2,
  range,
  smooth,
  wobble,
} from './shared';

/* ── void-field ───────────────────────────────────────────────────────────── */

interface Bar {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Index into the three tones, so the field has weight as well as texture. */
  tone: number;
  /**
   * Per-bar offset applied to the void's falloff, in normalised radii.
   *
   * Without it the hole is an ellipse with a perfectly graded edge, which reads
   * as a vignette — a lighting effect over a field rather than a shape cut out
   * of one. A fixed ±0.07 bias per bar makes the rim ragged at the scale of a
   * single bar, so the eye reads *torn out*. Sampled, so the raggedness travels
   * with the field and not with the hole.
   */
  bias: number;
}

/** The hole. Sampled before the bars so density cannot move it. */
interface Hole {
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** Half-axes of the closed orbit the centre walks. */
  ox: number;
  oy: number;
  phase: number;
}

interface Field {
  hole: Hole;
  bars: Bar[];
}

/** A packed field of vertical bars with a soft-edged void torn out of it. */

/**
 * Base alphas for the three weight tiers. Kept as numbers rather than as
 * pre-built colours because the rim term lifts each toward full accent, and
 * that has to happen per bar rather than per tier.
 */
const BASE_TONES = [0.25, 0.55, 0.9];

export default defineGenerator<Field>({
  name: 'void-field',
  label: 'Void Field',
  description:
    'A dense field of thin vertical bars with a soft-edged void carved out of the middle.',
  group: 'lattice',
  defaults: { density: 0.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    // The hole is drawn from the stream *first*, deliberately. Everything after
    // it is inside loops bounded by `density`, so sampling it last would make
    // the composition's one deliberate element the one thing that jumps when
    // the density slider moves. Drawn first, the void stays put and density
    // only changes how finely the field around it is combed.
    const rx = Math.min(p.width, p.height) * range(rng, 0.3, 0.4);
    const hole: Hole = {
      x: p.width * range(rng, 0.38, 0.62),
      y: p.height * range(rng, 0.38, 0.62),
      rx,
      // Wider than tall: on a 16:9 frame a circular void leaves two wide slabs
      // of untouched field to left and right and almost nothing above or below,
      // so the negative space stops being the subject.
      ry: rx * 0.72,
      ox: range(rng, 42, 78),
      oy: range(rng, 26, 52),
      phase: range(rng, 0, Math.PI * 2),
    };

    const pitch = lerp(15, 6.5, p.density);
    // Bars are stacked in rows rather than run floor to ceiling: a single bar
    // per column gives one silhouette across the top and one across the bottom,
    // and the field has no interior. Segmenting it means the void's rim cuts
    // through texture wherever it lands.
    const rowSpan = lerp(190, 118, p.density);
    const bars: Bar[] = [];
    for (let x = 0; x < p.width; x += pitch) {
      // Weight is per *column*, not per segment, so a column reads as one bar
      // interrupted rather than as unrelated marks that happen to be aligned.
      const w = pitch * range(rng, 0.3, 0.62);
      // Each column starts its row grid at its own offset. Sharing one grid
      // put every segment boundary on the same handful of scanlines, and the
      // field read as five stacked stripes of bars rather than as one field —
      // the horizon lines were more legible than the void was. Staggering the
      // phase costs one draw per column and dissolves them completely.
      const phase = range(rng, 0, 1);
      for (let top = -rowSpan * phase; top < p.height; top += rowSpan) {
        const h = rowSpan * range(rng, 0.24, 1.02);
        bars.push({
          x,
          y: top + (rowSpan - h) * range(rng, 0, 1),
          w,
          h,
          tone: Math.floor(range(rng, 0, 3)),
          bias: range(rng, -0.07, 0.07),
        });
      }
    }
    return { hole, bars };
  },
  // The composition is the hole, so the hole is what moves: a small closed
  // orbit plus a radius pulse, and the field itself never shifts. Moving the
  // bars instead would be a texture that shimmers; moving the void makes the
  // shape breathe and wander, which is the only thing here worth watching.
  project: ({ hole, bars }, p, t) => {
    // One cycle count for both axes of the orbit and a quarter-turn between
    // them: same `k` is what makes the path close on itself rather than trace a
    // Lissajous figure, and `cycles` is what makes it close at `t = 1` at all.
    const kOrbit = cycles(hole.ox, 2);
    const kPulse = cycles(hole.rx, 3);
    const vx = hole.x + hole.ox * wobble(t, kOrbit, hole.phase);
    const vy = hole.y + hole.oy * wobble(t, kOrbit, hole.phase + Math.PI / 2);
    const pulse = 1 + 0.2 * wobble(t, kPulse, hole.phase);
    const rx = hole.rx * pulse;
    const ry = hole.ry * pulse;

    let out = '';
    for (const b of bars) {
      const bx = b.x + b.w / 2;
      const by = b.y + b.h / 2;
      // Distance to the void in units of its own radii, so the falloff is one
      // number regardless of the ellipse's aspect.
      const d = Math.hypot((bx - vx) / rx, (by - vy) / ry) + b.bias;
      // Suppressed well inside the rim, full height a little outside it, and
      // smoothstepped between — a hard cut would alias into a staircase at bar
      // pitch, and a linear ramp leaves a visible cone of half-height bars.
      const ramp = Math.min(1, Math.max(0, (d - 0.82) / 0.3));
      const h = b.h * smooth(ramp);
      // Bars just outside the void brighten.
      //
      // Without it the hole is defined only by absence, and absence has no
      // edge — the field simply stops. A rim makes the void an object the
      // composition is arranged around rather than a place where the pattern
      // ran out. `1 - ramp` peaks exactly where the falloff is halfway, which
      // is the bars that are shortened but still present.
      const rim = ramp > 0 ? 1 - Math.abs(ramp * 2 - 1) : 0;
      // Every bar is emitted at every `t`, including the ones the void has
      // eaten entirely: dropping a bar changes how many numbers the frame
      // contains, which is the confetti signature the suite tests for even
      // though here it would only ever be the hole opening. A zero-height rect
      // draws nothing and costs one element.
      // Base tone lifted toward full accent by the rim term, so the void is
      // ringed by the brightest bars in the frame.
      const alpha = r2(
        BASE_TONES[b.tone] + rim * 0.5 * (1 - BASE_TONES[b.tone]),
      );
      // Position on the ramp is `rim` — the distance to the void the falloff
      // already computes. The hole is what this generator is about, so the
      // ramp's hot end lands on the bars ringing it and cools outward into the
      // undisturbed field.
      out += `<rect x="${r2(b.x)}" y="${r2(by - h / 2)}" width="${r2(b.w)}" height="${r2(h)}" fill="${ink(p, rim, alpha)}"/>`;
    }
    return frame(p, out);
  },
});
