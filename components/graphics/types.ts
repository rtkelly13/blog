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
  render: RenderFn;
}

/** Global fallbacks; individual generators override via `defaults`. */
export const BASE_PARAMS: GraphicParams = {
  width: 1280,
  height: 720,
  seed: 1,
  accent: '#22d3ee',
  background: 'transparent',
  density: 0.5,
  opacity: 1,
  strokeWidth: 2,
};
