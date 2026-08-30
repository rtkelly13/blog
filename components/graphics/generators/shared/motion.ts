/**
 * The two primitives that make a loop close.
 *
 * `cycles` cannot return a float and `wobble` is zero at both ends, which
 * between them are why `t = 0` is the still image and `t = 1` returns to it.
 * Every motion term in every generator goes through one or the other.
 */
import { TAU } from './math';

/**
 * Whole cycles per loop, derived from an already-sampled value.
 *
 * Integer by construction: `sin(θ + t·2π·k)` returns to its `t = 0` value at
 * `t = 1` only when `k` is an integer, so this is the reason the loop closes.
 * Returns 1..max.
 */
export const cycles = (v: number, max = 3): number =>
  1 + (Math.floor(Math.abs(v) * 1000) % max);

/**
 * A motion term that is zero at both `t = 0` and `t = 1`.
 *
 * `sin(t·2π·k + φ) − sin(φ)`. The subtracted term is what makes `t = 0` the
 * static image; the integer `k` is what makes `t = 1` return to it.
 */
export const wobble = (t: number, k: number, phase: number): number =>
  Math.sin(t * TAU * k + phase) - Math.sin(phase);

/**
 * How far a mark travels, as a fraction of the space it has.
 *
 * These are tuned against a measurement, not by eye: `tests/graphics-generators
 * .test.ts` asserts a floor on peak displacement, because the first pass picked
 * amplitudes like 0.18 and 0.12 that were arithmetically correct and visually
 * nothing — `dot-grid` peaked at 2.35px and moved 1.2% of its marks, which
 * reads as a still image. A generator that satisfies every coherence property
 * and does not visibly move has not been animated.
 */

export const ORBIT_OF_CELL = 0.13;

export const DRIFT_OF_FRAME = 0.035;
