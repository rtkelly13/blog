/**
 * Pure layout model for the chart primitives.
 *
 * This file is the whole of d3 in this codebase, and deliberately so: it takes
 * data in and hands back numbers and path strings. Nothing here touches the
 * DOM, schedules a frame or holds state, so every function is a total function
 * of its arguments — unit-testable, snapshotable, and safe to call during a
 * React render.
 *
 * The rule (docs/d3-research.md): **d3 computes, React renders.** Only named
 * `d3-*` submodules, never the `d3` meta-package (18.1 KB tree-shaken, 94.1 KB
 * the moment the namespace escapes), and never `d3-selection`,
 * `d3-transition` or `d3-axis` — React owns the marks and `motion` owns the
 * clock.
 */

import { extent, max } from 'd3-array';
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { format } from 'd3-format';
import { scaleBand, scaleLinear } from 'd3-scale';
import {
  curveLinear,
  curveLinearClosed,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  line,
} from 'd3-shape';

/** The design system's three accents, as component-facing names. */
export type Accent = 'cyan' | 'pink' | 'yellow' | 'ink';

/**
 * Accents resolve to `var(--brutalist-*)` with the neon value as the fallback,
 * matching the `C`-map pattern in components/interactive/. The dark themes
 * leave nothing to override, so the fallbacks *are* the dark palette; `.sketch`
 * re-points the tokens and every mark follows onto paper.
 */
export const ACCENT_VAR: Record<Accent, string> = {
  cyan: 'var(--brutalist-cyan, #22d3ee)',
  pink: 'var(--brutalist-pink, #ec4899)',
  yellow: 'var(--brutalist-yellow, #facc15)',
  ink: 'var(--color-white, #ffffff)',
};

/** Grid, axis and muted-text colours, on remapped tokens only. */
export const CHART_COLOR = {
  ink: 'var(--color-white, #ffffff)',
  grid: 'var(--color-zinc-800, #27272a)',
  muted: 'var(--color-zinc-500, #71717a)',
  surface: 'var(--color-zinc-900, #18181b)',
} as const;

/**
 * The only curves this design system permits. `d3-shape` exports 20; the
 * brutalist constraint (hard edges, no soft anything) leaves these five, so the
 * allow-list lives in the API rather than in a code-review comment.
 */
export const CURVES = {
  linear: curveLinear,
  linearClosed: curveLinearClosed,
  step: curveStep,
  stepBefore: curveStepBefore,
  stepAfter: curveStepAfter,
} as const;

export type CurveName = keyof typeof CURVES;

// ---------------------------------------------------------------------------
// Horizontal bars
// ---------------------------------------------------------------------------

export interface BarDatum {
  label: string;
  value: number;
  accent?: Accent;
  /** Free-text annotation rendered after the value. */
  note?: string;
  /** Marks a row as the comparison baseline (rendered outlined, not filled). */
  baseline?: boolean;
}

export interface BarsOptions {
  /** viewBox width. Height is derived from the row count. */
  width?: number;
  /** Row height in viewBox units, gap included. */
  rowHeight?: number;
  /** Band padding, 0..1. */
  padding?: number;
  /** Left gutter reserved for row labels. */
  labelWidth?: number;
  /** Right gutter reserved for the value label. */
  valueWidth?: number;
  /** Requested gridline count — `scale.ticks()` may return a nearby number. */
  tickCount?: number;
  /** d3-format specifier for values and tick labels. */
  valueFormat?: string;
  /** Pin the domain maximum instead of taking it from the data. */
  domainMax?: number;
}

export interface BarMark extends BarDatum {
  accent: Accent;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Baseline y for the row's label text, vertically centred. */
  textY: number;
  valueLabel: string;
}

export interface AxisTick {
  value: number;
  /** Position along the value axis, in viewBox units. */
  pos: number;
  label: string;
}

export interface BarsModel {
  width: number;
  height: number;
  plotX: number;
  plotWidth: number;
  bars: BarMark[];
  ticks: AxisTick[];
}

const BARS_DEFAULTS = {
  width: 720,
  rowHeight: 34,
  padding: 0.3,
  labelWidth: 250,
  valueWidth: 96,
  tickCount: 5,
  valueFormat: '.1f',
} satisfies Required<Omit<BarsOptions, 'domainMax'>>;

/**
 * Merge per field rather than by spread: a caller forwarding an unset prop
 * passes an explicit `undefined`, and `{...defaults, ...options}` would let it
 * clobber the default (the same trap `graphics/registry.ts` documents).
 */
function resolveBarsOptions(options: BarsOptions) {
  return {
    width: options.width ?? BARS_DEFAULTS.width,
    rowHeight: options.rowHeight ?? BARS_DEFAULTS.rowHeight,
    padding: options.padding ?? BARS_DEFAULTS.padding,
    labelWidth: options.labelWidth ?? BARS_DEFAULTS.labelWidth,
    valueWidth: options.valueWidth ?? BARS_DEFAULTS.valueWidth,
    tickCount: options.tickCount ?? BARS_DEFAULTS.tickCount,
    valueFormat: options.valueFormat ?? BARS_DEFAULTS.valueFormat,
  };
}

/**
 * Lay out a horizontal bar chart. `scaleBand` places the rows, `scaleLinear`
 * maps values to bar lengths, `d3-array`'s `max` finds the domain and
 * `d3-format` renders the labels — then React draws every rect and tick.
 */
export function layoutBars(
  data: readonly BarDatum[],
  options: BarsOptions = {},
): BarsModel {
  const o = resolveBarsOptions(options);
  const plotX = o.labelWidth;
  const plotWidth = Math.max(1, o.width - o.labelWidth - o.valueWidth);
  const height = Math.max(1, data.length * o.rowHeight);

  const y = scaleBand<string>()
    .domain(data.map((d, i) => rowKey(d, i)))
    .range([0, height])
    .padding(o.padding);

  const domainMax = options.domainMax ?? max(data, (d) => d.value) ?? 0;
  const x = scaleLinear()
    .domain([0, domainMax > 0 ? domainMax : 1])
    .nice()
    .range([0, plotWidth]);

  const fmt = format(o.valueFormat);
  const band = y.bandwidth();

  const bars: BarMark[] = data.map((d, i) => {
    const top = y(rowKey(d, i)) ?? 0;
    return {
      ...d,
      accent: d.accent ?? 'cyan',
      x: plotX,
      y: top,
      width: Math.max(0, x(d.value)),
      height: band,
      textY: top + band / 2,
      valueLabel: fmt(d.value),
    };
  });

  const ticks: AxisTick[] = x.ticks(o.tickCount).map((value) => ({
    value,
    pos: plotX + x(value),
    label: fmt(value),
  }));

  return { width: o.width, height, plotX, plotWidth, bars, ticks };
}

/** Bands need unique keys; duplicate labels are legal data, so index them. */
function rowKey(d: BarDatum, i: number): string {
  return `${i}:${d.label}`;
}

// ---------------------------------------------------------------------------
// Series (the permitted curves)
// ---------------------------------------------------------------------------

export interface SeriesOptions {
  width?: number;
  height?: number;
  padding?: number;
  curve?: CurveName;
}

export interface SeriesModel {
  width: number;
  height: number;
  path: string;
  /** The input points in viewBox space, for drawing the vertices. */
  points: { x: number; y: number }[];
}

/**
 * Map `[x, y]` data onto a viewBox and build the path with one of the five
 * permitted curves. `curve` is a `CurveName`, not a `d3-shape` curve factory,
 * so a soft curve cannot reach this from a call site.
 */
export function layoutSeries(
  data: readonly (readonly [number, number])[],
  options: SeriesOptions = {},
): SeriesModel {
  const width = options.width ?? 320;
  const height = options.height ?? 120;
  const pad = options.padding ?? 8;

  const xs = data.map(([vx]) => vx);
  const ys = data.map(([, vy]) => vy);
  const x = scaleLinear()
    .domain(safeExtent(xs))
    .range([pad, width - pad]);
  const y = scaleLinear()
    .domain(safeExtent(ys))
    .range([height - pad, pad]);

  const points = data.map(([vx, vy]) => ({ x: x(vx), y: y(vy) }));
  const path =
    line<{ x: number; y: number }>()
      .curve(CURVES[options.curve ?? 'linear'])
      .x((p) => p.x)
      .y((p) => p.y)(points) ?? '';

  return { width, height, path, points };
}

/** `extent` returns `[undefined, undefined]` for empty input, and a zero-width
 * domain maps every point onto one pixel — guard both. */
function safeExtent(values: readonly number[]): [number, number] {
  const [lo, hi] = extent(values);
  if (lo === undefined || hi === undefined) return [0, 1];
  return lo === hi ? [lo, lo + 1] : [lo, hi];
}

// ---------------------------------------------------------------------------
// Force layout
// ---------------------------------------------------------------------------

export interface GraphNode {
  id: string;
  accent?: Accent;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface ForceOptions {
  width?: number;
  height?: number;
  padding?: number;
  /** Ticks to run before reading the positions off. */
  ticks?: number;
  charge?: number;
  linkDistance?: number;
  /**
   * Room reserved on the right for node labels, which are drawn outside the
   * node marker. Without it a node placed at the domain maximum sits on the
   * edge and its label is clipped by the viewBox.
   */
  labelWidth?: number;
}

export interface PlacedNode {
  id: string;
  accent: Accent;
  x: number;
  y: number;
}

export interface PlacedLink {
  source: string;
  target: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ForceModel {
  width: number;
  height: number;
  ticks: number;
  nodes: PlacedNode[];
  links: PlacedLink[];
  /** Rounded coordinate digest — equal for two runs of the same input. */
  digest: string;
}

type SimNode = SimulationNodeDatum & { id: string; accent: Accent };

/**
 * Run a force simulation to completion and return the final positions.
 *
 * This is a *layout function*, not an animation: `d3-force@3` seeds its own
 * LCG rather than calling `Math.random` and places nodes on a deterministic
 * phyllotaxis spiral, so the same input always lands in the same place. The
 * two things that make that hold here:
 *
 * - **`.stop()` before the first tick.** `forceSimulation()` constructs a
 *   `d3-timer` before it returns, so without this a rAF loop is already
 *   running — which would break both the reduced-motion rule and the
 *   snapshot suite.
 * - **Fresh node objects per call.** d3-force writes `x`/`y`/`vx`/`vy` onto
 *   the objects it is given; reusing the caller's would make the second run
 *   start from the first run's output and diverge.
 */
export function layoutForce(
  nodes: readonly GraphNode[],
  links: readonly GraphLink[],
  options: ForceOptions = {},
): ForceModel {
  const width = options.width ?? 320;
  const height = options.height ?? 240;
  const pad = options.padding ?? 24;
  const ticks = options.ticks ?? 300;

  const simNodes: SimNode[] = nodes.map((n) => ({
    id: n.id,
    accent: n.accent ?? 'cyan',
  }));

  // `forceLink` throws "node not found" on a link naming an absent node, which
  // would take the whole layout down over one bad edge — so dangling links are
  // dropped here rather than filtered out at render time.
  const ids = new Set(simNodes.map((n) => n.id));
  const validLinks = links.filter(
    (l) => ids.has(l.source) && ids.has(l.target),
  );
  const simLinks: SimulationLinkDatum<SimNode>[] = validLinks.map((l) => ({
    source: l.source,
    target: l.target,
  }));

  const simulation = forceSimulation<SimNode>(simNodes)
    .force('charge', forceManyBody().strength(options.charge ?? -180))
    .force(
      'link',
      forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
        .id((d) => d.id)
        .distance(options.linkDistance ?? 60),
    )
    .force('centre', forceCenter(0, 0))
    .stop();

  for (let i = 0; i < ticks; i++) simulation.tick();

  // Fit the settled cloud into the viewBox: the simulation works in its own
  // unbounded space, so the scales are what make it renderable at any size.
  const labelWidth = options.labelWidth ?? 60;
  const x = scaleLinear()
    .domain(safeExtent(simNodes.map((n) => n.x ?? 0)))
    .range([pad, Math.max(pad, width - pad - labelWidth)]);
  const y = scaleLinear()
    .domain(safeExtent(simNodes.map((n) => n.y ?? 0)))
    .range([pad, height - pad]);

  const placed: PlacedNode[] = simNodes.map((n) => ({
    id: n.id,
    accent: n.accent,
    x: x(n.x ?? 0),
    y: y(n.y ?? 0),
  }));
  const byId = new Map(placed.map((n) => [n.id, n]));

  const placedLinks: PlacedLink[] = validLinks.map((l) => {
    // Both endpoints exist by construction — validLinks was filtered above.
    const a = byId.get(l.source) as PlacedNode;
    const b = byId.get(l.target) as PlacedNode;
    return {
      source: l.source,
      target: l.target,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
    };
  });

  const digest = placed
    .map((n) => `${n.id}:${n.x.toFixed(4)},${n.y.toFixed(4)}`)
    .join('|');

  return { width, height, ticks, nodes: placed, links: placedLinks, digest };
}
