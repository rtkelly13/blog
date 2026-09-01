/**
 * Legibility rules for a backdrop. Reasoning and citations in
 * `docs/graphics-legibility.md`; this file is the enforcement.
 *
 * The rule that matters is the counter-intuitive one: **a background is
 * constrained from above.** WCAG exempts decorative content from any contrast
 * floor, but text over a varying background must hold 4.5:1 against the area
 * *immediately behind the letters* — so a pattern that is fine on average and
 * dark in patches fails wherever a patch lands under a word.
 *
 * Compositing ink over paper, that ceiling lands at alpha 0.5: at 0.5 body text
 * still holds 4.55:1, and at 0.6 it drops to 3.42:1 and fails.
 */
import { describe, expect, it } from 'vitest';
import { GENERATOR_LIST, renderGraphic } from '../components/graphics/registry';
import type { GraphicParams } from '../components/graphics/types';
import {
  markAlphas as alphas,
  MAX_LOUD_SHARE,
  TEXT_SAFE_ALPHA,
  textSafeOpacity,
} from '../lib/graphicsLegibility';

function params(over: Partial<GraphicParams> = {}): GraphicParams {
  return {
    width: 1280,
    height: 720,
    seed: 7,
    accent: '#22d3ee',
    background: 'transparent',
    density: 0.55,
    opacity: 1,
    strokeWidth: 2,
    t: 0,
    occlusion: '#0a0a1a',
    disorder: 0,
    contrast: 1,
    originX: 0.5,
    originY: 0.5,
    ...over,
  };
}

const NAMES = GENERATOR_LIST.map((g) => g.name);

describe('every generator is usable behind text', () => {
  it.each(NAMES)('%s: is text-safe at a sensible opacity', (name) => {
    // Not "text-safe at full weight" — see above. The bar is that it does not
    // have to be dimmed into invisibility to be usable: anything below about a
    // half is a generator you cannot really put behind a paragraph.
    expect(textSafeOpacity(name)).toBeGreaterThanOrEqual(0.5);
  });
});

describe('marks are actually visible', () => {
  it.each(NAMES)(
    '%s: something is drawn above the perceptual floor',
    (name) => {
      // The other end of the same argument. Below roughly 0.08 a thin stroke is
      // lost to anti-aliasing before it reaches the screen — WCAG 1.4.11 notes
      // that thin shapes render fainter than their declared colour, which is why
      // sub-3px lines carry the higher 4.5:1 requirement.
      const a = alphas(renderGraphic(name, params()));
      if (a.length === 0) return;
      expect(Math.max(...a)).toBeGreaterThan(0.08);
    },
  );

  it.each(NAMES)('%s: draws at least one substantial mark', (name) => {
    // Whichever kind carries the image has to clear its own bar, and the two
    // bars are different because the penalties are.
    //
    // A stroke is an *edge*: thin lines are discounted twice, once by alpha and
    // once by the rasteriser, so it is judged on `strokeWidth x alpha`. A fill
    // is an *area* and takes no thin-line penalty, so alpha alone is the
    // measure.
    //
    // Asking only about strokes was the first attempt and it was wrong twice
    // over: `orbit-rings` strokes nothing but a faint guide circle behind
    // filled beads, and `ribbon-grid` outlines its facets at 0.13 alpha over
    // fills three times heavier. Both draw perfectly visible pictures out of
    // the mark the test was ignoring.
    const svg = renderGraphic(name, params());
    // Heaviest alpha against heaviest width, rather than pairing them on the
    // same element. Deliberately an upper bound: `void-field` hoists
    // `stroke-width` onto `<g>` tier groups to keep its markup small, so a
    // same-element regex finds nothing at all and reports a generator that
    // covers the frame as drawing no substantial mark. The question here is
    // whether anything visible is emitted, and an upper bound answers it
    // without the test needing to understand every batching strategy.
    const strokeAlpha = Math.max(
      0,
      ...[...svg.matchAll(/stroke="rgba\([^)]*,\s*([\d.]+)\)"/g)].map((m) =>
        Number(m[1]),
      ),
    );
    const strokeWidth = Math.max(
      0,
      ...[...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => Number(m[1])),
    );
    const strokeWeight = strokeAlpha * strokeWidth;
    const fillAlpha = Math.max(
      0,
      ...[...svg.matchAll(/fill="rgba\([^)]*,\s*([\d.]+)\)"/g)].map((m) =>
        Number(m[1]),
      ),
    );
    expect(strokeWeight > 0.5 || fillAlpha > 0.15).toBe(true);
  });
});

describe('the paper theme is the harder case', () => {
  it.each(NAMES)('%s: its sketch weight buys real headroom', (name) => {
    // Ink on white is heavier than accent on black at the same alpha, which is
    // what `sketchWeight` exists to correct. A generator that declares one must
    // end up at least as text-safe as it is on black, or the correction is
    // decoration.
    const g = GENERATOR_LIST.find((x) => x.name === name);
    if (!g?.sketch || g.sketchWeight >= 1) return;
    const a = alphas(renderGraphic(name, params({ accent: '#23262e' })));
    if (a.length === 0) return;
    const loud =
      a.filter((v) => v * g.sketchWeight > TEXT_SAFE_ALPHA).length / a.length;
    expect(loud).toBeLessThanOrEqual(MAX_LOUD_SHARE);
  });
});
