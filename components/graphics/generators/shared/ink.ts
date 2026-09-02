/**
 * Choosing a colour, which is the one thing every generator does and none of
 * them used to do flexibly.
 *
 * The old idiom was `withAlpha(p.accent, a)` everywhere: one hue, and the whole
 * range expressed as transparency. That conflates two different ideas —
 * *further away* and *more see-through* — which only coincide on a dark
 * backdrop, and it makes every graphic monochrome by construction.
 *
 * `ink()` takes a **position** as well as an alpha. The position is what
 * carries meaning, and picking it is the design work: depth for `ridgeline`,
 * radius for the radial family, height for `iso-cubes`, field strength for
 * `flow-field`. A position chosen arbitrarily produces a gradient that is
 * merely decorative; the axis the generator is already about produces one that
 * reads as part of the form.
 *
 * With a single accent this is exactly `withAlpha(p.accent, a)`, byte for byte,
 * which is what let it be adopted across generators pinned by goldens.
 */
import { sampleRamp, withAlpha } from '../../palette';
import type { GraphicParams } from '../../types';

/**
 * Midpoint that `contrast` pivots about.
 *
 * Fixed rather than per-generator, so the parameter behaves the same way
 * everywhere. Generators pick their own alpha ranges and a per-generator pivot
 * would make `contrast: 0.5` mean something different in each.
 */
const CONTRAST_PIVOT = 0.5;

/**
 * A colour from the graphic's ramp at `pos` (0..1), at `alpha` before contrast.
 *
 * `pos` is clamped, so a generator may hand it an unnormalised ratio without
 * guarding. `alpha` is compressed toward {@link CONTRAST_PIVOT} by
 * `p.contrast` — below 1 the loud and quiet marks converge, which is what a
 * backdrop behind text wants and what `opacity` cannot express, since scaling
 * everything equally preserves the ratio between brightest and faintest.
 */
export function ink(p: GraphicParams, pos: number, alpha: number): string {
  const ramp = p.accents;
  const base =
    ramp && ramp.length > 1 ? sampleRamp(ramp, pos) : (ramp?.[0] ?? p.accent);
  const c = p.contrast ?? 1;
  const a =
    c === 1
      ? alpha
      : Math.min(1, Math.max(0, CONTRAST_PIVOT + (alpha - CONTRAST_PIVOT) * c));
  return withAlpha(base, a);
}

/**
 * An opaque colour from the ramp — for occlusion faces and solid fills, where
 * transparency would defeat the purpose.
 */
export function solidInk(p: GraphicParams, pos: number): string {
  const ramp = p.accents;
  return ramp && ramp.length > 1
    ? sampleRamp(ramp, pos)
    : (ramp?.[0] ?? p.accent);
}

/** The centre a centred generator should use, honouring `originX`/`originY`. */
export function centre(p: GraphicParams): [number, number] {
  return [p.width * (p.originX ?? 0.5), p.height * (p.originY ?? 0.5)];
}
