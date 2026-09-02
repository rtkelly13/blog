/**
 * How far a background generator has to be dimmed before text can sit on it.
 *
 * Reasoning and citations in `docs/graphics-legibility.md`. The short version:
 * WCAG exempts decorative content from any contrast *floor*, but text over a
 * varying background must hold 4.5:1 against the area immediately behind the
 * letters — so a backdrop is constrained from above, and the question worth
 * answering is not "is this generator too loud" but "at what weight is it
 * quiet enough".
 *
 * Lives here rather than in the test that first needed it because the benchmark
 * report wants it too, and a test file is not a module.
 */
import { renderGraphic } from '../components/graphics/registry';
import type { GraphicParams } from '../components/graphics/types';

/**
 * Alpha above which a mark would push body text under 4.5:1 if a word landed on
 * it. Derived by compositing ink over paper: at 0.50 text holds 4.55:1, at 0.60
 * it drops to 3.42:1.
 */
export const TEXT_SAFE_ALPHA = 0.5;

/**
 * How much of a generator may exceed it.
 *
 * Not zero: bright marks are what stop a texture being inert, and the odds of a
 * word landing on one scale with their area rather than their existence.
 */
export const MAX_LOUD_SHARE = 0.2;

function referenceParams(over: Partial<GraphicParams> = {}): GraphicParams {
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

/** Every `rgba()` alpha in the emitted markup, in document order. */
export function markAlphas(svg: string): number[] {
  return [...svg.matchAll(/rgba\([^)]*,\s*([\d.]+)\)/g)].map((m) =>
    Number(m[1]),
  );
}

/**
 * The highest global `opacity` at which no more than {@link MAX_LOUD_SHARE} of
 * a generator's marks composite above {@link TEXT_SAFE_ALPHA}.
 *
 * Stepped in twentieths rather than solved, because the answer is guidance
 * printed to two decimal places and a closed form would suggest a precision the
 * underlying perceptual threshold does not have.
 */
export function textSafeOpacity(
  name: string,
  over: Partial<GraphicParams> = {},
): number {
  const a = markAlphas(renderGraphic(name, referenceParams(over)));
  if (a.length === 0) return 1;
  for (let step = 20; step >= 1; step--) {
    const o = step / 20;
    const loud = a.filter((v) => v * o > TEXT_SAFE_ALPHA).length / a.length;
    if (loud <= MAX_LOUD_SHARE) return o;
  }
  return 0;
}
