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

/* ── weave ────────────────────────────────────────────────────────────────── */

/** One band, in whichever of the two directions its array belongs to. */
interface Band {
  /** Centreline position across the frame — `y` for a warp row, `x` for a weft column. */
  offset: number;
  /**
   * Undulation phase. Alternate bands are half a period out, which is what puts
   * a band's crest exactly where it passes *over* and its trough where it goes
   * under — the geometry of a plain weave rather than a stack of wavy lines.
   */
  phase: number;
  /** Sampled brightness, so the cloth has thread-to-thread variation. */
  tone: number;
}

interface Weave {
  /** Band spacing in px. Sampled, because it derives from `density`. */
  pitch: number;
  rows: Band[];
  cols: Band[];
  /**
   * Per-crossing over/under, indexed `row * cols.length + col`.
   *
   * Sampled rather than derived from `t` on purpose. The decision selects which
   * of two element shapes gets a colour and which gets `none`, so deriving it
   * from time would change the emitted number count mid-loop — the confetti
   * signature the suite fails on. Sampled, it is fixed for the whole animation
   * and only the geometry moves.
   */
  over: boolean[];
  /** Whole ripple cycles per loop. Integer via `cycles`, so `t = 1` is `t = 0`. */
  travel: number;
}

/**
 * Interlaced bands — the one place occlusion earns its keep outside isometry.
 *
 * Two sets of bands cross at right angles, and at every crossing one of them
 * has to be *in front*. That cannot be said with alpha: `withAlpha(accent, …)`
 * is see-through by construction, so a band drawn over another in a translucent
 * accent reads as two overlapping ribbons on the same plane, and the crossings
 * turn into a brighter patch rather than into cloth. Painting the front band
 * `p.occlusion` — opaque, matching the surface — is what makes it genuinely
 * hide the one behind, and the interlace only exists because of that.
 *
 * The draw order is three passes, and the third is where the weave happens:
 *
 *  1. every warp (horizontal) band, complete;
 *  2. every weft (vertical) band, complete — these now cover the warps
 *     *everywhere*, which is the state a naive two-pass version stops at;
 *  3. at each crossing the warp is meant to win, a short patch of that warp
 *     redrawn over the top, occluding the weft locally.
 *
 * A patch is emitted at every crossing regardless, so the number count never
 * changes; the ones whose weft is on top are simply painted `none`. Emitting
 * nothing there would be the same bug as deciding over/under from `t`.
 *
 * Motion travels the undulation *along* the bands rather than bobbing them in
 * place, so crests move through the crossings and the cloth ripples the way a
 * hanging textile does.
 */

export default defineGenerator<Weave>({
  name: 'weave',
  label: 'Weave',
  description:
    'Interlaced bands passing over and under each other — occlusion without isometry.',
  group: 'lattice',
  defaults: { density: 0.5, strokeWidth: 1.5 },

  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const pitch = lerp(164, 88, p.density);

    // Both directions are laid out a full pitch past the edges: a weave that
    // stops at the frame shows its selvedge, and the undulation moves.
    const band = (index: number, offset: number): Band => ({
      offset,
      // The π per index is the plain-weave alternation; the jitter is the only
      // random part, kept small so the crests still line up with the crossings.
      phase: index * Math.PI + range(rng, -0.22, 0.22),
      tone: range(rng, 0.35, 1),
    });

    const rows: Band[] = [];
    for (let y = -pitch, i = 0; y < p.height + pitch; y += pitch, i++) {
      rows.push(band(i, y));
    }
    const cols: Band[] = [];
    for (let x = -pitch, i = 0; x < p.width + pitch; x += pitch, i++) {
      cols.push(band(i, x));
    }

    // Checkerboard with the occasional flaw, so it reads as woven by hand
    // rather than as a printed grid. Drawn from the stream after the bands, in
    // one flat pass, so adding a row does not re-roll the flaws of a column.
    const over: boolean[] = [];
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < cols.length; c++) {
        const plain = ((r + c) & 1) === 0;
        over.push(rng() < 0.11 ? !plain : plain);
      }
    }

    // One tempo for the whole cloth: separate per-band speeds would let the
    // bands slide out of phase with each other and the interlace would stop
    // reading as a single surface.
    return { pitch, rows, cols, over, travel: cycles(rng(), 2) };
  },

  project: ({ pitch, rows, cols, over, travel }, p, t) => {
    // Narrow enough that the gaps between bands stay open: bands that nearly
    // touch fill the frame with accent and the interlace has nothing to show
    // against.
    const half = pitch * 0.21;
    const amp = pitch * 0.12;
    // One undulation period spans two pitches — over one crossing and under the
    // next — which is what makes the waviness agree with the over/under field.
    const k = Math.PI / pitch;
    const edge = withAlpha(p.accent, 0.5);
    const phase = t * TAU * travel;

    /** Centreline of a band at distance `s` along its own length. */
    const centre = (b: Band, s: number) =>
      b.offset + amp * Math.sin(s * k + b.phase + phase);

    // Warp and weft are tinted differently, and that difference is what makes
    // the interlace *legible*: at a crossing the eye can see which of the two
    // shades survived, so over and under are readable in a still frame rather
    // than only in the geometry.
    const tint = (b: Band, warp: boolean) =>
      withAlpha(p.accent, r2((warp ? 0.34 : 0.1) + b.tone * 0.18));

    // Sampled finely enough that a period gets eight vertices; below that the
    // sine reads as a zigzag and the cloth looks creased rather than woven.
    const step = pitch / 4;
    const startX = -pitch;
    const endX = p.width + pitch;
    const startY = -pitch;
    const endY = p.height + pitch;

    let out = '';

    /** A band as a ribbon polygon: out along one edge, back along the other. */
    const ribbon = (b: Band, from: number, to: number, vertical: boolean) => {
      let fwd = '';
      let back = '';
      for (let s = from; s <= to + step * 0.5; s += step) {
        const c = centre(b, s);
        fwd += vertical
          ? `${r2(c - half)},${r2(s)} `
          : `${r2(s)},${r2(c - half)} `;
        back =
          (vertical
            ? `${r2(c + half)},${r2(s)} `
            : `${r2(s)},${r2(c + half)} `) + back;
      }
      return (fwd + back).trim();
    };

    const draw = (points: string, b: Band, warp: boolean) => {
      // Opaque first, then the accent over it. The opaque pass is the whole
      // point — it is what stops the band behind showing through.
      out += `<polygon points="${points}" fill="${p.occlusion}"/>`;
      out += `<polygon points="${points}" fill="${tint(b, warp)}" stroke="${edge}" stroke-width="${p.strokeWidth}"/>`;
    };

    for (const b of rows) draw(ribbon(b, startX, endX, false), b, true);
    for (const b of cols) draw(ribbon(b, startY, endY, true), b, false);

    // Pass three: the crossings the warp wins. `span` reaches a stroke width
    // past the weft so the patch buries its edge rather than leaving a hairline.
    const span = half + p.strokeWidth;
    const patchStep = span / 2;
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 0; c < cols.length; c++) {
        const col = cols[c];
        // Where the two centrelines actually meet, not where the lattice says
        // they would: both are undulating, so the crossing has drifted. One
        // refinement is plenty — the residual is well under a stroke width.
        const xc =
          col.offset +
          amp * Math.sin(centre(row, col.offset) * k + col.phase + phase);
        const on = over[r * cols.length + c];
        let top = '';
        let bot = '';
        let fwd = '';
        let back = '';
        for (
          let x = xc - span;
          x <= xc + span + patchStep * 0.5;
          x += patchStep
        ) {
          const y = centre(row, x);
          fwd += `${r2(x)},${r2(y - half)} `;
          back = `${r2(x)},${r2(y + half)} ${back}`;
          top += `${top ? 'L' : 'M'}${r2(x)} ${r2(y - half)}`;
          bot += `${bot ? 'L' : 'M'}${r2(x)} ${r2(y + half)}`;
        }
        const points = (fwd + back).trim();
        // Every crossing emits all three marks. Under-crossings paint them
        // `none`: identical numbers, invisible ink.
        out += `<polygon points="${points}" fill="${on ? p.occlusion : 'none'}"/>`;
        out += `<polygon points="${points}" fill="${on ? tint(row, true) : 'none'}"/>`;
        out += `<path d="${top}${bot}" fill="none" stroke="${on ? edge : 'none'}" stroke-width="${p.strokeWidth}"/>`;
      }
    }

    return frame(p, out);
  },
});
