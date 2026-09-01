import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  cycles,
  frame,
  ink,
  intRange,
  lerp,
  mulberry32,
  r2,
  range,
  valueNoise,
  wobble,
} from './shared';

/* ── void-field ───────────────────────────────────────────────────────────── */

/**
 * One cavity, as a circle in an implicit field.
 *
 * The circles are never drawn. They are unioned by {@link smin} into a single
 * signed-distance field and it is that field's zero contour the marks are cut
 * against, which is what makes two cavities bulge toward one another and fuse
 * as they approach rather than simply overlapping.
 */
interface Cavity {
  /** Rest centre. The orbit below is added to it, and is zero at `t = 0`. */
  x: number;
  y: number;
  r: number;
  /** Half-axes of the closed orbit the centre walks. */
  ax: number;
  ay: number;
  /** Phases for the two axes and for the radius pulse. */
  px: number;
  py: number;
  pr: number;
}

/**
 * One mark: a vertical stroke, positioned once and never moved sideways.
 *
 * Only `y` and the two offsets change over the loop, so a mark's `x` is emitted
 * as the same number at every `t` — the field has a fixed grain and everything
 * that happens to it happens along it.
 */
interface Tick {
  x: number;
  /** Centre of the tick at rest, before the column drift. */
  y: number;
  /** Half-length before the cavities cut into it. */
  half: number;
  /** Alpha out in the open field, away from every contour. */
  base: number;
  /** Column index, so a whole column drifts together. */
  col: number;
}

interface Field {
  cavities: Cavity[];
  /**
   * Marks grouped by weight tier.
   *
   * The grouping is decided here rather than in `project` because it decides
   * *where in the document* a mark is emitted: each tier becomes one `<g>` with
   * its own `stroke-width`, and a mark that changed tier mid-loop would move to
   * a different document index and register as a teleport even though nothing
   * visibly moved. Tier comes from the texture noise, which has no `t` in it,
   * so it is frozen here by construction.
   *
   * It is also what makes the file small: stroke width lives on the group, so a
   * mark is `<path d="…" stroke="…"/>` and nothing more.
   */
  tiers: Tick[][];
  /** Per-column drift phase, indexed by `Tick.col`. */
  colPhase: number[];
  /** Vertical drift amplitude, in pixels. Derived from the row pitch. */
  drift: number;
}

/** Stroke weights, as multiples of `strokeWidth`. Three is enough to read. */
const TIER_WEIGHTS = [0.6, 0.95, 1.5];

/**
 * How far two surfaces have to be apart before the union stops blending them,
 * in pixels.
 *
 * This is the whole lava-lamp behaviour in one number. A plain `min` of the
 * distances gives cavities that intersect with a crease where they meet; the
 * smooth minimum below rounds that crease off over `SMOOTH_UNION` pixels, so
 * two cavities drawing together first pull a bulge toward each other, then fuse
 * into one, then pinch back apart — for free, and continuously, which is what
 * the constant-mark-count rule needs.
 */
const SMOOTH_UNION = 110;

/**
 * Width of the bright band around a contour, in pixels.
 *
 * Wide enough to read as a halo rather than a hairline, narrow enough that the
 * open field between cavities stays quiet — this sits behind body text.
 */
const RIM_BAND = 72;

/** Pixels a clipped end is pulled back beyond the contour. See its use. */
const EDGE_TOE = 2.5;

/**
 * Polynomial smooth minimum — the smooth union of two signed distance fields.
 *
 * `min(a, b)` is exact but has a crease at the seam; subtracting the quadratic
 * term rounds the seam over `k` and leaves the result still very nearly a
 * distance, which matters here because every downstream number (how far a tick
 * retracts, how bright its rim is) is measured in pixels.
 */
const smin = (a: number, b: number, k: number): number => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

/**
 * A quiet vertical grain with cavities melted out of it.
 *
 * ## The cavities are an implicit field, not shapes
 *
 * The previous version scaled bar heights by a smoothstepped ellipse. That
 * gives a *fade*, not a hole: the bars get shorter toward the middle and the
 * eye never finds an edge, so the negative space reads as a vignette laid over
 * the field rather than as something cut out of it. Negative space needs a
 * boundary to be a shape at all.
 *
 * So the cavities are now a signed-distance field — several circles unioned by
 * {@link smin} — and a mark is *clipped* against its zero contour rather than
 * scaled by its value. A tick's end stops exactly where the contour crosses it,
 * which puts a real silhouette through the texture at sub-mark accuracy, and
 * the same field gives the rim band for free as "within `RIM_BAND` of zero".
 *
 * The implicit field is also the only cheap way to get cavities that *merge*.
 * Summed or smooth-unioned fields fuse and separate continuously, so two
 * cavities passing close pull toward each other, join, and pinch apart again
 * with no special case anywhere — and, importantly here, without any mark ever
 * being added or removed.
 *
 * ## Why clipping is safe for the coherence suite
 *
 * The obvious way to clip is to solve for the exact crossing along the tick,
 * `m = g_top / (g_top − g_bot)`. That is geometrically right and temporally
 * awful: where a contour grazes a tick the denominator goes to zero and the
 * crossing sweeps the whole tick in one frame, which is a teleport by the
 * suite's measure and a flicker to the eye.
 *
 * Because `smin` of distances is itself a distance, the retraction can be
 * written in pixels instead: the end retracts by however far *inside* the
 * cavity it is. A signed distance field is 1-Lipschitz, so moving a cavity by
 * `d` pixels moves any end by at most `d` pixels — the retraction is bounded by
 * the cavity's own speed no matter the geometry, and grazing incidence is no
 * longer a special case. That single property is why the field is distances
 * smoothly unioned rather than the more usual sum of `r²/d²` blobs.
 *
 * ## The grain, and why it is not uniform
 *
 * A field of identical marks at an even pitch is noise: there is nothing at a
 * scale larger than a mark for the eye to hold, so it reads as static, and a
 * hole in it reads as damage rather than as a subject. Two octaves of value
 * noise, sampled once in `sample`, drive alpha, stroke weight and length from
 * one number, so the field has drifts of heavy continuous combing and quiet
 * passages of thin broken ticks at a scale several marks across. The cavities
 * then cut through a texture that already had structure to lose.
 *
 * Length is the subtle one of the three. It only spans 0.98 to 1.2 of the row
 * pitch, which is not a visible difference in a mark — it is the difference
 * between a column that breaks between rows and one that runs unbroken, and
 * that is what the eye actually reads at field scale.
 */
export default defineGenerator<Field>({
  name: 'void-field',
  label: 'Void Field',
  description:
    'A quiet vertical grain with cavities melted out of it — they drift, merge and pinch apart.',
  group: 'lattice',
  // Its depth cue is filled area at varying alpha, which reads as distance on
  // black and as flat grey ink on paper. See `GeneratorModule.sketch`.
  sketch: false,
  // Viscous. The cavities cross a good part of the frame over a loop, and at
  // pace 1 that reads as sliding rather than as flowing.
  speed: 0.3,
  defaults: { density: 0.5 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const min = Math.min(p.width, p.height);

    // The cavities are drawn from the stream *first*, deliberately. Everything
    // after them sits inside loops bounded by `density`, so sampling them last
    // would make the composition's one deliberate element the one thing that
    // jumps when the density slider moves. Drawn first, the voids stay put and
    // density only changes how finely the field around them is combed.
    // Two or three, not three or four. Negative space reads as the subject only
    // when it is *large*, and four cavities sharing a frame forces every one of
    // them small — the result was a mottled field with clearings rather than a
    // field with holes punched through it. Fewer and bigger also merge more
    // dramatically, which is the whole point of the smooth union.
    const count = intRange(rng, 2, 3);
    const cavities: Cavity[] = [];
    for (let i = 0; i < count; i++) {
      cavities.push({
        // Slotted across the frame rather than placed at random: independent
        // uniform points clump, and two cavities that start on top of each
        // other are one cavity for the whole loop. The slot is the spacing,
        // the jitter is the variety.
        x: p.width * ((i + 0.5) / count) + range(rng, -0.09, 0.09) * p.width,
        // Alternating above and below the middle rather than anywhere in a
        // band: sampled independently they landed at much the same height and
        // merged into one horizontal trench across the frame, which reads as a
        // horizon and not as cavities. Staggered, they meet at an angle.
        y: p.height * (0.5 + (i % 2 === 0 ? -1 : 1) * range(rng, 0.08, 0.24)),
        // A spread of sizes, so the composition has a subject and a chorus
        // rather than several equal blobs.
        // Roughly doubled. At 0.12–0.22 of the short side a cavity was an
        // eighth of the frame's width and read as a clearing; at 0.24–0.38 it
        // is unmistakably a hole, and two of them at that size dominate the
        // composition the way the reference pattern's void does.
        r: min * range(rng, 0.24, 0.38),
        // Big enough that neighbouring slots overlap at some point in the
        // loop — that overlap is when they merge, and a lava lamp that never
        // merges is just several holes. The two axes are drawn separately so
        // the orbit is not a circle, which would make every cavity's path the
        // same shape at a different size.
        ax: range(rng, 62, 130),
        ay: range(rng, 60, 130),
        px: range(rng, 0, Math.PI * 2),
        py: range(rng, 0, Math.PI * 2),
        pr: range(rng, 0, Math.PI * 2),
      });
    }

    // Tightened from 30..21. The field was sitting at 618 elements against a
    // 900 ceiling and reading as scattered dashes rather than as a surface,
    // which is fatal here: a void is absence, and absence only registers
    // against something present. Spending the headroom on *columns* rather
    // than on rows is the efficient direction — see the note below.
    const colPitch = lerp(24, 17, p.density);
    // Rows four times as far apart as columns, which is the whole element
    // budget in one number.
    //
    // What makes a field read as *dense* is the column pitch — how many
    // vertical lines cross the frame — and what makes it expensive is the mark
    // count, which is both pitches multiplied. So: columns close together, rows
    // far apart, and each column is eight or nine long strokes rather than
    // forty short ones. A square lattice fine enough to look like this costs
    // four times as many elements for an identical picture.
    //
    // The bound is at density 1, not at the default: 21px here is 618 elements
    // on a 1280×720 frame, against a ceiling of 900.
    const rowPitch = colPitch * 4.3;

    /**
     * Texture weight at a point, 0..1. Two octaves: the broad one lays down
     * the zones, the finer one keeps their boundaries from reading as bands.
     * Sampled here and stored per mark, because it must not depend on `t`.
     */
    const texture = (x: number, y: number) =>
      0.66 * valueNoise(x / 300, y / 300, p.seed) +
      0.34 * valueNoise(x / 118, y / 118, p.seed + 31);

    const tiers: Tick[][] = TIER_WEIGHTS.map(() => []);
    const colPhase: number[] = [];
    let col = 0;
    for (let x = colPitch * 0.5; x < p.width + colPitch; x += colPitch) {
      colPhase.push(range(rng, 0, Math.PI * 2));
      // Each column starts its row grid at its own offset. Sharing one grid put
      // every tick end on the same handful of scanlines and the field read as
      // stacked stripes — the horizon lines were more legible than the voids
      // were. One draw per column dissolves them completely.
      const phase = range(rng, 0, 1);
      for (let y = -rowPitch * phase; y < p.height + rowPitch; y += rowPitch) {
        const jx = x + range(rng, -0.16, 0.16) * colPitch;
        const jy = y + range(rng, -0.05, 0.05) * rowPitch;
        const n = texture(jx, jy);
        // Jittered before the tier is taken, so a zone boundary frays instead
        // of drawing a hard line between two stroke weights.
        const nt = n + range(rng, -0.11, 0.11);
        const tier = nt < 0.4 ? 0 : nt < 0.7 ? 1 : 2;
        tiers[tier].push({
          x: jx,
          y: jy,
          half: rowPitch * lerp(0.49, 0.6, n),
          // Raised from 0.18..0.46. At the old range the comb was barely
          // present against black, so a cavity full of black was a hole in
          // nothing. Still well short of full accent — this sits behind body
          // text — but the field has to be a surface before its absence means
          // anything.
          base: lerp(0.3, 0.68, n),
          col,
        });
      }
      col++;
    }

    // Under a cell, so the drift reads as the field breathing rather than as
    // the lattice sliding past itself.
    return { cavities, tiers, colPhase, drift: rowPitch * 0.45 };
  },
  /**
   * Everything here is a function of the cavity field, which is a function of
   * `t` alone — the marks themselves were placed once and never move sideways.
   *
   * Each cavity walks a closed orbit at a whole number of cycles per loop and
   * pulses its radius at another, so `t = 1` returns every centre and every
   * radius to its `t = 0` value exactly. Two cycle counts per cavity rather
   * than one means the orbits are Lissajous figures rather than ellipses, which
   * is what stops four cavities looking like four hands of a clock.
   */
  project: ({ cavities, tiers, colPhase, drift }, p, t) => {
    // Positions and radii resolved once per frame, not once per mark: the
    // inner loop runs several hundred times over three or four cavities and
    // there is no reason for it to re-evaluate a sine each time.
    const cx: number[] = [];
    const cy: number[] = [];
    const cr: number[] = [];
    for (const c of cavities) {
      // `cycles` is what makes the loop close at all — it cannot return a
      // float, so every orbit is a whole number of turns. Max 2, because this
      // wants to be slow: three turns of a 130px orbit inside one loop is a
      // cavity darting about, not one drifting.
      const kx = cycles(c.ax, 2);
      const ky = cycles(c.ay, 2);
      const kr = cycles(c.r, 2);
      cx.push(c.x + c.ax * wobble(t, kx, c.px));
      cy.push(c.y + c.ay * wobble(t, ky, c.py));
      // A gentle swell. Without it a cavity is a rigid disc sliding around;
      // with it the whole field looks like it has surface tension.
      cr.push(c.r * (1 + 0.13 * wobble(t, kr, c.pr)));
    }

    /**
     * Signed distance to the merged cavity surface: negative inside, positive
     * outside, in pixels. Seeded with the first cavity rather than with
     * `Infinity` so no non-finite value is ever in flight.
     */
    const sdf = (x: number, y: number): number => {
      let d = Math.hypot(x - cx[0], y - cy[0]) - cr[0];
      for (let i = 1; i < cx.length; i++) {
        d = smin(d, Math.hypot(x - cx[i], y - cy[i]) - cr[i], SMOOTH_UNION);
      }
      return d;
    };

    // One drift value per column, for the same reason the cavity centres are
    // hoisted: it is shared by every tick in the column.
    const kDrift = cycles(drift, 2);
    const shift = colPhase.map((ph) => drift * wobble(t, kDrift, ph));

    let out = '';
    for (let tier = 0; tier < tiers.length; tier++) {
      // Stroke weight on the group, so it is paid once per tier instead of
      // once per mark. That leaves a mark as `<path d stroke>` and nothing
      // else, which is about a fifth off the file — this gets inlined into
      // HTML and reparsed every frame.
      out += `<g stroke-width="${r2(p.strokeWidth * TIER_WEIGHTS[tier])}">`;
      for (const k of tiers[tier]) {
        const y = k.y + shift[k.col];
        const dTop = sdf(k.x, y - k.half);
        const dBot = sdf(k.x, y + k.half);
        // The retraction, in pixels: an end that is `d` inside the cavity pulls
        // back by `d`, and one outside keeps its full reach. Because the field
        // is a distance, this puts the end on the contour rather than near it,
        // and — see the note above — it can never move faster than the cavity
        // that caused it, whatever the angle of incidence.
        // `EDGE_TOE` is subtracted from a *clipped* end only — `min` with the
        // untouched half means a mark out in the open field keeps its full
        // reach — so it costs the silhouette a couple of pixels of inset and
        // in exchange no sub-pixel stub survives inside a cavity. Without it
        // the negative space is peppered with specks, which is the one thing
        // it cannot afford: the interior has to be genuinely empty.
        const up = Math.min(k.half, Math.max(0, k.half + dTop - EDGE_TOE));
        const down = Math.min(k.half, Math.max(0, k.half + dBot - EDGE_TOE));
        // A tick swallowed whole collapses to `v0` rather than being dropped.
        // Omitting it would change how many numbers the frame contains, which
        // is the confetti signature the suite tests for — and here it would
        // fire every time two cavities merged, which is the one moment the
        // generator exists for.
        const len = up + down;
        // Proximity to the contour, from the two distances the clip already
        // cost us: 1 for a mark whose nearer end is on or past the contour,
        // falling to 0 one rim-band out into the open field.
        //
        // The *nearer end* rather than the centre, deliberately. A mark is a
        // hundred pixels long, so measuring from its centre puts peak
        // brightness on marks the cavity has already eaten and leaves the ones
        // actually drawing the silhouette dim — the halo ends up ringing a
        // shape half a mark inside the one you can see.
        const rim = Math.min(
          1,
          Math.max(0, 1 - Math.min(dTop, dBot) / RIM_BAND),
        );
        // Position on the ramp is `rim` — proximity to the cavity contour, the
        // one axis this generator is entirely about. The hot end of the ramp
        // therefore lands exactly on the marks that draw the silhouette and
        // cools outward into undisturbed field, so with two accents the
        // negative space is outlined in the second colour and the boundary is
        // legible in a still frame, which brightness alone cannot manage
        // against a texture this quiet.
        //
        // The lift is what makes the void an object rather than a place where
        // the pattern ran out: absence on its own has no edge.
        const alpha = r2(k.base + rim * rim * (0.7 - k.base));
        out += `<path d="M${r2(k.x)} ${r2(y - up)}v${r2(len)}" stroke="${ink(p, rim, alpha)}"/>`;
      }
      out += '</g>';
    }
    return frame(p, out);
  },
});
