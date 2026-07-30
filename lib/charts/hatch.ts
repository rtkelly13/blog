/**
 * Hatch texture as a secondary encoding for chart series.
 *
 * Colour alone is not always enough: in print, in forced-colors mode, and
 * wherever a pair sits in the CVD 6-8 warn band, identity has to survive without
 * hue. A directional hatch adds that second channel — the angle alternates by
 * slot, so neighbouring series differ in stripe direction as well as colour.
 *
 * The patterns themselves are rendered by `components/charts/ChartHatchDefs`.
 * These helpers are pure so chart definitions (which are module-scope and
 * framework-free) can reference the fills without importing React.
 */

import { CHART_PALETTE } from './palette';

/** Alternating stripe angles. Adjacent slots always differ. */
export const HATCH_ANGLES = [45, 135] as const;

export function hatchAngle(slot: number): number {
  return HATCH_ANGLES[slot % HATCH_ANGLES.length];
}

/** DOM id for one slot's pattern. `prefix` should come from React's `useId()`. */
export function hatchId(prefix: string, slot: number): string {
  return `${prefix}-hatch-${slot}`;
}

/** Paint value for one slot — drop-in replacement for a solid series colour. */
export function hatchFill(prefix: string, slot: number): string {
  return `url(#${hatchId(prefix, slot)})`;
}

/**
 * The full hatch equivalent of `CHART_PALETTE`, in the same slot order — so
 * swapping texture on is a one-line change to a colour scale's range.
 */
export function hatchPalette(prefix: string): readonly string[] {
  return CHART_PALETTE.map((_, slot) => hatchFill(prefix, slot));
}
