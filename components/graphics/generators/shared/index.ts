/**
 * Primitives every generator module builds on, and the one import surface.
 *
 * ## Why generators are split into `sample` and `project`
 *
 * `rng.ts` guarantees *determinism*: same params ⇒ byte-identical SVG. Animation
 * needs a strictly stronger property — *coherence*: adjacent inputs ⇒ adjacent
 * images. Determinism does not imply it.
 *
 * The rng stream is **positional**. It is consumed inline, in draw order, inside
 * loops whose bounds derive from `density`. Nudge `density` and the cell count
 * changes, so every subsequent draw shifts one position down the stream and the
 * whole composition re-rolls. Each frame is individually valid and the sequence
 * is confetti.
 *
 * Confining the rng to `sample()` fixes it. `sample` depends on everything
 * except `t`; `project` is pure arithmetic and draws no randomness, so a
 * renderer varying only `t` is provably drawing the same structure each frame.
 *
 * ## The two invariants
 *
 *  1. **`t = 0` is the static image.** Motion terms are written `f(t) − f(0)`
 *     via {@link wobble}, so the pre-animation SVG is emitted unchanged.
 *  2. **`t = 1` is `t = 0`.** Every cycle count is an integer, so
 *     `sin(2πk + φ)` returns to `sin(φ)` and a loop driven as
 *     `frame / durationInFrames` closes seamlessly. {@link cycles} cannot
 *     return a float, which is what enforces it.
 *
 * Both are asserted in `tests/graphics-generators.test.ts`, along with a
 * smoothness floor and a minimum displacement — a generator that satisfies
 * every coherence property and does not visibly move has not been animated.
 *
 * ## Adding motion without moving the stream
 *
 * Motion parameters are *derived* from values already sampled, never drawn
 * fresh. A new `rng()` call inside `sample` shifts every subsequent draw and
 * re-rolls the composition — the exact failure this design prevents,
 * reintroduced by the code adding the animation.
 *
 * ## The modules behind this barrel
 *
 * | Module | Responsibility |
 * | --- | --- |
 * | `math` | `lerp`, `r2`, `TAU` |
 * | `motion` | `cycles` and `wobble` — the loop-closure primitives |
 * | `noise` | deterministic value noise; sample it on a circle to loop |
 * | `disorder` | the order-to-chaos ramp, hashed rather than drawn |
 * | `svg` | the `<svg>` wrapper every `project` returns |
 * | `tiling` | lattice re-exports, and the travelling-field helper |
 *
 * They are re-exported together so a generator has one import line and no
 * decision to make about where a helper lives. Import from a specific module
 * only when writing another shared primitive.
 */

export { mix, withAlpha } from '../../palette';
export type { Rng } from '../../rng';
export { chance, intRange, mulberry32, pick, range } from '../../rng';

export * from './disorder';
export * from './math';
export * from './motion';
export * from './noise';
export * from './svg';
export * from './tiling';
