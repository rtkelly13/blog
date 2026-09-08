/**
 * Shared contract for every graphic/background generator. A generator is a pure
 * function from `GraphicParams` to an SVG string — no React, no DOM — so the
 * same output can be rendered inline, turned into a data URI for a CSS
 * background, or written to a file.
 */
export interface GraphicParams {
  /** viewBox width (aspect ratio only — the SVG scales to its container). */
  width: number;
  /** viewBox height. */
  height: number;
  /** Deterministic seed — same seed + params ⇒ identical SVG. */
  seed: number;
  /**
   * Normalised loop position, 0..1. `0` and `1` are the *same image* for every
   * generator — see `wobble` in `generators.ts` — so a renderer can drive this
   * as `frame / durationInFrames` and get a seamless loop.
   *
   * `t` is the only param that may be animated. Everything else (`density`
   * above all) moves a loop bound in `sample()`, which re-rolls the whole
   * composition; see the module docstring in `generators.ts`.
   */
  t: number;
  /** Foreground "ink" colour (the themeable accent). */
  accent: string;
  /** Backdrop fill, or `'transparent'` to let a parent background show through. */
  background: string;
  /** How busy the graphic is, 0..1. Meaning is per-generator but monotonic. */
  density: number;
  /** Overall opacity applied to the whole graphic, 0..1. */
  opacity: number;
  /** Base stroke width in viewBox units. */
  strokeWidth: number;
}

export type RenderFn = (params: GraphicParams) => string;

/**
 * A generator split into its two halves.
 *
 * `sample` consumes the entire rng stream and depends on everything *except*
 * `t`; `project` is pure arithmetic over the sampled structure and consumes no
 * randomness at all. That boundary is the whole point: it is what makes
 * adjacent `t` values produce adjacent images rather than independent ones.
 */
export interface SampledGenerator<S> {
  sample: (params: GraphicParams) => S;
  project: (structure: S, params: GraphicParams, t: number) => string;
}

export type ControlType = 'seed' | 'density' | 'strokeWidth' | 'opacity';

/** Metadata that lets the gallery build live controls generically. */
export interface Generator {
  /** Stable id used in frontmatter and the registry (kebab-case). */
  name: string;
  /** Human label for the gallery. */
  label: string;
  /** One-line description of the look. */
  description: string;
  /** Per-generator default params (merged over the global defaults). */
  defaults: GraphicParams;
  /** One-shot: samples and projects in a single call. Re-samples every time. */
  render: RenderFn;
  /**
   * The time-invariant half. Consumes the whole rng stream; depends on every
   * param except `t`.
   *
   * A frame renderer should call this **once** and hold the result, then call
   * {@link Generator.project} per frame. Re-sampling per frame is not merely
   * wasteful — it is the bug the split exists to prevent, since any param drift
   * between frames re-rolls the composition.
   */
  sample: (params: GraphicParams) => unknown;
  /** The time-driven half. Pure arithmetic; consumes no randomness. */
  project: (structure: unknown, params: GraphicParams, t: number) => string;
}

/** Global fallbacks; individual generators override via `defaults`. */
export const BASE_PARAMS: GraphicParams = {
  width: 1280,
  height: 720,
  seed: 1,
  t: 0,
  accent: '#22d3ee',
  background: 'transparent',
  density: 0.5,
  opacity: 1,
  strokeWidth: 2,
};
