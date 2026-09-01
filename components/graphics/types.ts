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
  /**
   * An ordered colour ramp, used *instead of* `accent` when it has two or more
   * entries. One entry, or none, behaves exactly as `accent` alone does.
   *
   * Every generator used to derive its whole range from one colour and an
   * alpha, which conflates two different things: "further away" and "more
   * transparent". They are only the same on a dark backdrop, and even there it
   * means the entire set is monochrome — a graphic can be quiet or loud but
   * never warm at one end and cool at the other.
   *
   * A ramp separates them. `ink()` takes a *position* alongside the alpha, and
   * the position is the part that carries meaning: depth for `ridgeline`,
   * radius for the radial family, height for `iso-cubes`, field strength for
   * `flow-field`. Handing it an arbitrary number would produce a gradient that
   * is merely decorative; handing it the axis the generator is already about
   * produces one that reads.
   */
  accents?: string[];
  /**
   * Spread of the internal weight range, 1 by default.
   *
   * Distinct from `opacity`, and the distinction is the point: `opacity` scales
   * everything by the same factor, so a graphic dimmed to 0.2 still has its
   * brightest marks four times its faintest. `contrast` compresses the range
   * itself — below 1 the loud and quiet marks converge, which is what a
   * backdrop behind body text actually wants; above 1 it exaggerates, for hero
   * art. Applied about a fixed midpoint so its effect is predictable across
   * generators that chose different ranges.
   */
  contrast: number;
  /**
   * Where a centred generator puts its centre, in normalised frame coordinates.
   * `[0.5, 0.5]` by default.
   *
   * The radial family exists so a background can sit *behind a title* rather
   * than merely under it — which only works if the centre can be moved to
   * wherever the title is not. Ignored by generators with no centre.
   */
  originX: number;
  originY: number;
  /** Backdrop fill, or `'transparent'` to let a parent background show through. */
  background: string;
  /** How busy the graphic is, 0..1. Meaning is per-generator but monotonic. */
  density: number;
  /** Overall opacity applied to the whole graphic, 0..1. */
  opacity: number;
  /** Base stroke width in viewBox units. */
  strokeWidth: number;
  /**
   * Opaque fill for faces that hide what is behind them.
   *
   * Not a shade of `accent` and not `background`. Overlapping solids need a
   * colour that says *"this face occludes the one behind it"*, and neither of
   * the other two can supply it: `withAlpha(accent, …)` is see-through by
   * construction, so stacked cubes show through each other, and `background`
   * defaults to `'transparent'` — correct for layering over a surface, and
   * therefore no colour at all.
   *
   * So it is its own parameter, defaulting to the theme's surface rather than
   * to `background`. Only generators that actually stack geometry read it; the
   * rest ignore it, which is why it can be added without moving a golden.
   */
  occlusion: string;
  /**
   * How much the composition comes apart across the frame, 0..1.
   *
   * `0` is a strict lattice everywhere and is the default, so every generator
   * that honours this renders exactly as it did before it existed.
   *
   * Distinct from `density`, which sets how *many* marks there are, and from
   * the per-mark wobble in `project`, which displaces every mark by the same
   * amount and therefore reads as uniform texture. This is a *gradient*: order
   * at one edge decaying to chaos at the other. A texture has no composition;
   * a ramp does.
   *
   * Sampled, not projected — it perturbs where marks *are*, so like `density`
   * it must not be animated. Interpolating two sampled structures is the way to
   * do that, and is deliberately not attempted here.
   */
  disorder: number;
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

export type ControlType =
  | 'seed'
  | 'density'
  | 'strokeWidth'
  | 'opacity'
  | 'disorder';

/** Metadata that lets the gallery build live controls generically. */
export interface Generator {
  /** Family, for grouped galleries. */
  group: GeneratorGroup;
  /** Loop-duration multiplier; see {@link GeneratorModule.speed}. */
  speed: number;
  /** Holds up as ink on paper; see {@link GeneratorModule.sketch}. */
  sketch: boolean;
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

/**
 * What a generator module exports, and the whole contract for adding one.
 *
 * Metadata lives *with* the implementation deliberately. It used to sit in a
 * `META` table in `registry.ts` while the code sat in `generators.ts`, so adding
 * a generator meant editing three files and forgetting the third was silent —
 * a generator with no label rendered as its own id. Co-locating them makes the
 * module the single unit: one file is one generator, complete.
 *
 * `S` is the sampled structure and stays private to the module. Nothing outside
 * needs to know what a generator sampled, only that `project` accepts what its
 * own `sample` returned.
 */
export interface GeneratorModule<S = unknown> {
  /** Stable kebab-case id. Must equal the module's filename — a test asserts it. */
  name: string;
  /** Human label for galleries. */
  label: string;
  /** One line on what the generator looks like. */
  description: string;
  /**
   * Rough family, for grouping in galleries. Presentation only — nothing
   * behavioural hangs off it.
   */
  group: GeneratorGroup;
  /**
   * Whether this generator holds up in the light `sketch` theme — ink on paper.
   *
   * Not a taste call: it follows from how the generator carries its structure,
   * and it was decided by rendering all of them in the paper palette and
   * looking.
   *
   * The first pass at this excluded every generator whose depth cue is filled
   * area — the lattices, the isometrics, `weave` — because they all rendered as
   * a flat grey wash. That diagnosis was right and the remedy was wrong: the
   * cause is not the generator, it is that **the same alpha is far heavier as
   * ink on white than as an accent on black**. 30% cyan over black is a hint;
   * 30% graphite over paper is a solid grey.
   *
   * So the light theme now defaults to roughly half weight
   * (`graphicThemeDefaults`), and six of the eight rejects came back looking
   * like print rather than mud. Only two remain out:
   *
   * - `weave` — large filled bands are most of its area, so halving the weight
   *   leaves a grey slab rather than a lighter texture.
   * - `void-field` — its subject is a hole in a dark field. On paper the field
   *   is already pale, so the hole has nothing to be absent *from*.
   *
   * Required rather than defaulted, so a new generator has to be rendered on
   * paper and looked at before it ships.
   */
  sketch: boolean;
  /** Per-generator defaults, merged over {@link BASE_PARAMS}. */
  defaults?: Partial<GraphicParams>;
  /**
   * How fast this generator wants to be driven, as a multiplier on the loop
   * duration. Default 1; `0.5` takes twice as long to complete one loop.
   *
   * Deliberately *not* a `GraphicParams` field. Everything in that interface
   * changes what is drawn, and this changes nothing — it is the renderer's
   * business. It also cannot be a multiplier on `t`, which is the obvious
   * implementation and the wrong one: `t` scaled by anything non-integral
   * leaves the motion mid-cycle at the end of the loop, and every generator's
   * closure depends on `t` running exactly 0 to 1. Stretching the *duration*
   * leaves that untouched — the loop is identical, it simply takes longer.
   *
   * Radial generators are the ones that need it. Tangential speed is `ω · r`,
   * so a centred form at full reach covers far more ground per turn than a
   * lattice mark does per wobble, and one turn per loop is already brisk. The
   * alternative — turning less than once — is not available, because a partial
   * turn does not close.
   */
  speed?: number;
  /**
   * The time-invariant half. Consumes the entire rng stream and depends on
   * every param except `t`.
   */
  sample: (params: GraphicParams) => S;
  /** The time-driven half. Pure arithmetic; consumes no randomness. */
  project: (structure: S, params: GraphicParams, t: number) => string;
}

/** Families a generator can belong to. Ordered as galleries should present them. */
export const GENERATOR_GROUPS = [
  'lattice',
  'field',
  'radial',
  'terrain',
  'isometric',
] as const;

export type GeneratorGroup = (typeof GENERATOR_GROUPS)[number];

/**
 * Identity helper that keeps `S` inferred.
 *
 * Without it a module would have to name its own structure type twice, or widen
 * to `unknown` and lose the check that `project` accepts what `sample` returned.
 * With it, `sample` and `project` are type-checked against each other and the
 * structure type never has to be written down at all.
 */
export function defineGenerator<S>(
  module: GeneratorModule<S>,
): GeneratorModule<S> {
  return module;
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
  occlusion: '#0a0a1a',
  disorder: 0,
  contrast: 1,
  originX: 0.5,
  originY: 0.5,
};
