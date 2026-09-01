import { defineGenerator } from '../types';
import type { Rng } from './shared';
import {
  frame,
  ink,
  intRange,
  lerp,
  mix,
  mulberry32,
  r2,
  range,
  solidInk,
  TAU,
  valueNoise,
} from './shared';

/* ── ridgeline ────────────────────────────────────────────────────────────── */

interface Ridge {
  /** Horizon height for this layer, as a fraction of the frame. */
  base: number;
  /** Where in noise space this layer's circle sits — its own terrain. */
  ox: number;
  oy: number;
  seed: number;
  /**
   * Frame-widths spanned by one full trip around the noise circle, and
   * therefore also the drift speed. Near ranges cover more ground per loop;
   * that is the parallax.
   */
  period: number;
}

/**
 * Layered mountains, angular rather than rolling.
 *
 * ## How the loop closes, and why that used to make it too fast
 *
 * A ridge slides by adding to the coordinate before the frequency multiplies
 * it: `u = x/W + t·speed`. At `t = 1` every harmonic has advanced by
 * `freq · speed` cycles, so the range lands exactly where it started **provided
 * that product is a whole number**.
 *
 * With arbitrary integer frequencies that forces `speed` itself to be an
 * integer — and one whole frame-width per loop is already a brisk drift, so the
 * slowest range this could draw was too fast and the fastest crossed three
 * widths and blurred.
 *
 * Deriving every harmonic in a layer from one base `f0` removes the constraint.
 * The frequencies are `f0, 2·f0, 3·f0`, so `speed = 1/f0` still gives a whole
 * number of cycles on each, and a range can now creep at an eighth of a width.
 *
 * ## One parameter, two cues, and they agree
 *
 * `f0` is also what sets a range's detail — more peaks for higher `f0`. Distant
 * mountains read as many small peaks *and* barely move; near ones as few large
 * peaks that travel. Both fall out of the same number in the same direction, so
 * the parallax and the aerial perspective cannot drift apart: they are the same
 * parameter.
 *
 * Far ranges take `f0 ≈ 8` and drift 0.125 frame-widths per loop; near ones
 * `f0 ≈ 3` and 0.333. A 2.7x spread, and nothing crosses the frame.
 *
 * ## Peaks, not hills
 *
 * `1 - |sin θ|` rather than `sin θ`: the absolute value puts a corner at every
 * zero crossing, and harmonics with decaying amplitude give a self-similar
 * profile with no noise function anywhere.
 *
 * Three harmonics sampled 192 times, not four sampled 96. `1 - |sin|` peaks
 * twice per period, so a far range's top harmonic of 24 puts 48 peaks across
 * the frame; below about four samples per peak the corners alias into noise,
 * which is the opposite of a crisp silhouette.
 */

/**
 * Ridged fractal noise — octaves of `1 - |2n - 1|`, each half the amplitude and
 * twice the frequency of the last.
 *
 * The ridging is what makes it terrain rather than hills: taking the absolute
 * value folds the noise at its midline and puts a crease at every crossing, and
 * summing octaves with halving amplitude makes those creases self-similar. It
 * is the same trick the old harmonic sum used `1 - |sin|` for, applied to
 * something that is not periodic.
 */
export const ridgedFbm = (x: number, y: number, seed: number): number => {
  let sum = 0;
  let norm = 0;
  let amp = 1;
  let f = 1;
  // Carried between octaves, and the reason this makes crests rather than
  // hills. A plain sum of ridged octaves is smooth everywhere, because the fine
  // detail is spread evenly over the whole profile; weighting each octave by
  // the last concentrates it *on the ridges already there*, so a crest keeps
  // sharpening while a valley stays smooth. That asymmetry is what mountains
  // look like, and an unweighted sum reads as rolling hills.
  let weight = 1;
  for (let o = 0; o < RIDGE_OCTAVES; o++) {
    const n = valueNoise(x * f, y * f, seed + o * 17);
    // Fold at the midline: the absolute value puts a crease at every crossing.
    const ridge = (1 - Math.abs(2 * n - 1)) ** 2;
    sum += amp * ridge * weight;
    norm += amp;
    weight = Math.min(1, ridge * RIDGE_GAIN);
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
};

/**
 * Octaves in a ridge, and samples across the frame — set together, because the
 * first aliases without enough of the second.
 *
 * The finest octave is `2^(octaves-1)` times the base feature rate. At
 * `RIDGE_NOISE_R = 0.62` the frame spans about 3.9 base features, so five
 * octaves put ~62 creases across it and 320 samples give five per crease.
 * Pinned by a test that counts extrema in the rendered profile, so adding an
 * octave without adding samples fails rather than quietly aliasing.
 */
export const RIDGE_OCTAVES = 5;
export const RIDGE_SAMPLES = 320;

/**
 * How strongly a ridge invites the next octave's detail. Above about 3 the
 * weighting saturates and the effect goes back to being a plain sum.
 */
export const RIDGE_GAIN = 2.4;

/**
 * Radius of the circle traced through noise space, per loop.
 *
 * Bigger means more distinct terrain around the loop and finer features on
 * screen; this is the knob that trades variety against aliasing.
 */
export const RIDGE_NOISE_R = 0.62;

/**
 * Arc a spoke tip sweeps per loop, as a fraction of the wheel's reach.
 *
 * Tuned against the measurement rather than by eye — see the note in
 * `radial-spokes`' `project`. It is an arc length, not an angle, because
 * equalising arc across radius is the whole point.
 */

export default defineGenerator<Ridge[]>({
  name: 'ridgeline',
  label: 'Ridgeline',
  description:
    'Layered angular mountains, parallaxing — depth by contrast, not perspective.',
  group: 'terrain',
  sketch: true,
  defaults: { density: 0.55, strokeWidth: 2 },
  sample: (p) => {
    const rng: Rng = mulberry32(p.seed);
    const layers = Math.round(lerp(3, 7, p.density));
    const ridges: Ridge[] = [];
    for (let i = 0; i < layers; i++) {
      const depth = i / Math.max(1, layers - 1); // 0 = furthest, 1 = nearest
      ridges.push({
        base: lerp(0.42, 0.96, depth),
        // Each layer gets its own patch of noise space, far enough from the
        // others that no two ranges are correlated.
        ox: range(rng, -40, 40),
        oy: range(rng, -40, 40),
        seed: intRange(rng, 1, 9999),
        // Frame-widths per loop, and the reason a range can drift at all
        // without repeating. See the note above `project`.
        period: lerp(1, 1.5, depth),
      });
    }
    return ridges;
  },
  /**
   * ## Why the terrain is noise on a circle
   *
   * Three attempts at this were sums of sine harmonics, and all three repeated,
   * for a reason no amount of frequency-picking fixes: a sum of sinusoids whose
   * frequencies share a divisor `g` is periodic with period `1/g`, and loop
   * closure forces them to share one. The best available was `g = 1` — one
   * period per frame — which is not a repeat on screen but is still only three
   * sines, and three sines read as *wavy*, never as random.
   *
   * Terrain needs octaves, and octaves of noise are not periodic at all. Which
   * is normally a problem here, because the loop has to close exactly.
   *
   * Sampling the noise **around a circle** solves both at once. Walk a circle in
   * 2D noise space as `x` crosses the frame, and the profile is fractal noise —
   * genuinely aperiodic to look at, no two features alike — while being exactly
   * periodic in the *loop* parameter, because a circle returns to where it
   * started. `t = 1` lands on `t = 0` by construction rather than by arithmetic
   * luck, and there is nothing to repeat within the frame because one trip round
   * the circle spans more than a frame.
   *
   * ## Parallax, without giving the periodicity back
   *
   * `period` is how many frame-widths one trip around the circle covers, and it
   * doubles as the drift speed: advancing `u` by `period` is one full circuit,
   * so the range lands exactly where it started. Near ranges take a larger
   * `period`, which means both a faster drift *and* broader features — the two
   * cues distance gives you, from one number, pointing the same way.
   *
   * A period below 1 would put more than one circuit inside the frame, which is
   * exactly the repeat this exists to avoid. So 1 is the floor, and it is a
   * property of the construction rather than a tuning choice.
   */
  project: (ridges, p, t) => {
    const step = p.width / RIDGE_SAMPLES;
    let out = '';
    for (let i = 0; i < ridges.length; i++) {
      const r = ridges[i];
      const depth = ridges.length === 1 ? 1 : i / (ridges.length - 1);
      // Depth is carried by contrast, not perspective: far ranges are faint and
      // thin, near ranges bright and heavy.
      // Position on the ramp is `depth` — the axis this generator is already
      // about. With a single accent this is byte-identical to the old
      // `withAlpha(p.accent, …)`; with a ramp, the far ranges take one end of
      // it and the near ranges the other, so distance is carried by hue as well
      // as by contrast.
      const stroke = ink(p, depth, 0.22 + depth * 0.68);
      // Opaque, so a near range hides the ones behind it. This was
      // `withAlpha(p.accent, 0.04 + depth * 0.07)` — alpha 0.04 to 0.11,
      // through which every far range stayed fully visible, so the layers were
      // stacked in draw order and occluded nothing. Mountains hide what is
      // behind them, and that is most of what makes a range read as distance.
      const fillA = mix(p.occlusion, solidInk(p, depth), 0.05 + depth * 0.12);
      // Distance flattens, so relief grows toward the viewer. It used to run
      // the other way and gave the furthest range the deepest spikes.
      const relief = lerp(0.16, 0.26, depth) * p.height;

      let d = `M0 ${p.height} `;
      for (let x = 0; x <= p.width; x += step) {
        // One circuit of the circle per `period` frame-widths. Drift is added
        // to the coordinate before the angle is taken, so every octave moves
        // together and the range translates rather than boiling.
        const ang = ((x / p.width + t * r.period) / r.period) * TAU;
        const h = ridgedFbm(
          r.ox + RIDGE_NOISE_R * Math.cos(ang),
          r.oy + RIDGE_NOISE_R * Math.sin(ang),
          r.seed,
        );
        d += `L${r2(x)} ${r2(r.base * p.height - h * relief)} `;
      }
      d += `L${p.width} ${p.height} Z`;
      out += `<path d="${d.trim()}" fill="${fillA}" stroke="${stroke}" stroke-width="${r2(p.strokeWidth * (0.6 + depth * 1.2))}" stroke-linejoin="miter"/>`;
    }
    return frame(p, out);
  },
});
