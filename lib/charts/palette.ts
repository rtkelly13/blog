/**
 * Chart palette slots, as CSS variable references.
 *
 * The colour VALUES live in `css/tailwind.css` — that is the source of truth and
 * what `tests/chart-palette.test.ts` validates. This module only names the slots
 * so chart code never writes `var(--ts-chart-3)` by hand, and never a hex.
 */

/**
 * Categorical series colours, in fixed order.
 *
 * The order is the colourblind-safety mechanism: it was derived by search so
 * that neighbouring slots stay distinguishable under protanopia and
 * deuteranopia. **Never reorder it, never cycle it, and never append a
 * generated 9th hue** — a generated colour cannot be pre-validated, and past
 * eight slots no ordering of any palette clears the separation floors. Beyond
 * the caps, fold the tail into "Other" (`foldToOther`) or facet.
 */
export const CHART_PALETTE = [
  'var(--ts-chart-1)',
  'var(--ts-chart-2)',
  'var(--ts-chart-3)',
  'var(--ts-chart-4)',
  'var(--ts-chart-5)',
  'var(--ts-chart-6)',
  'var(--ts-chart-7)',
  'var(--ts-chart-8)',
] as const;

/**
 * How many series a chart form can carry before colour stops doing its job.
 *
 * `adjacent` applies where only neighbouring marks touch — bars, stacked bars,
 * lines. `allPairs` applies where any two marks can end up side by side, so
 * every pair must be separable: scatter, bubble, choropleth, small multiples.
 * The all-pairs number is much lower and is the one people forget.
 */
export const SERIES_CAP = { adjacent: 8, allPairs: 4 } as const;

/** The neutral "everything else" bucket. Not an identity colour by design. */
export const CHART_OTHER = 'var(--ts-chart-other)';

/**
 * Single-hue ramp for MAGNITUDE and for ORDERED categories — tiers, buckets,
 * cohorts, year bands, heatmap cells. Light→dark.
 *
 * If reordering the categories would change the meaning, the data is ordinal and
 * belongs on this ramp, not on `CHART_PALETTE`. Using identity colours for
 * ordered data throws away the ordering the reader could otherwise see.
 */
export const CHART_SEQUENTIAL = [
  'var(--ts-chart-seq-1)',
  'var(--ts-chart-seq-2)',
  'var(--ts-chart-seq-3)',
  'var(--ts-chart-seq-4)',
  'var(--ts-chart-seq-5)',
  'var(--ts-chart-seq-6)',
  'var(--ts-chart-seq-7)',
] as const;

/**
 * Partial `ChartTheme` for a TanStack chart definition.
 *
 * Needed because the library's built-in default palette has only six slots;
 * passing this widens it to eight. Text, grid and axes keep `currentColor`, so
 * they follow the theme without being named here.
 */
export const chartTheme = { palette: CHART_PALETTE } as const;

/** Pick `count` leading slots, erroring rather than wrapping past the end. */
export function seriesColors(count: number): readonly string[] {
  if (count > CHART_PALETTE.length) {
    throw new Error(
      `${count} series exceeds the ${CHART_PALETTE.length}-slot palette. ` +
        'Fold the tail into "Other" with foldToOther(), or facet into small ' +
        'multiples — do not generate or cycle colours.',
    );
  }
  return CHART_PALETTE.slice(0, Math.max(0, count));
}
