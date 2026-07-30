/**
 * Pure model behind `MigrationRatioChart`: turns per-year legacy/modern project
 * counts into stacked bar segments, and exposes a `stateAt(plan, progress)`
 * reveal so the chart can grow from its baseline without the renderer owning any
 * layout maths.
 *
 * Same shape as `mapReduceModel.ts` — build a plan once, then sample it purely.
 * Stacking lives here rather than in the chart because TanStack Charts
 * deliberately leaves data preparation to the application; marks consume rows
 * that already carry their interval endpoints.
 */

/** One year of the migration: how many projects sat on each side of the line. */
export interface MigrationRow {
  year: number;
  /** Projects still on the legacy target framework. */
  legacy: number;
  /** Projects moved to the modern target framework. */
  modern: number;
}

export type MigrationBand = 'legacy' | 'modern';

/**
 * A single stacked rectangle. `y1`/`y2` are absolute stack endpoints, so the
 * chart can hand them straight to a `rect` mark with no further arithmetic.
 */
export interface StackedSegment {
  /** Stable scene + reconciliation identity. */
  key: string;
  year: number;
  band: MigrationBand;
  y1: number;
  y2: number;
  /** The band's own count, independent of where it sits in the stack. */
  value: number;
}

export interface MigrationRatio {
  legacy: number;
  modern: number;
  /** Modern share of the final year's total, in [0, 1]. */
  modernShare: number;
}

export interface MigrationPlan {
  /** Cleaned, year-ascending rows. */
  rows: readonly MigrationRow[];
  /** Fully-grown segments, legacy below modern within each year. */
  segments: readonly StackedSegment[];
  years: readonly number[];
  /** Tallest stack across all years; at least 1 so scales never collapse. */
  maxTotal: number;
  /** Counts for the last year — the figure the chart's caption quotes. */
  finalRatio: MigrationRatio;
  /** Reveal windows per year, as a fraction of the whole timeline. */
  stagger: number;
}

const EMPTY_RATIO: MigrationRatio = { legacy: 0, modern: 0, modernShare: 0 };

function isFiniteCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Build the stacked layout. Rows with a non-finite year or a negative/NaN count
 * are dropped rather than coerced — a broken row should disappear, not quietly
 * render as a zero-height bar that reads as real data. Rows are sorted by year
 * so the output is deterministic regardless of input order.
 *
 * `stagger` is the fraction of the timeline between one year's reveal and the
 * next; `0` reveals every bar together.
 */
export function buildMigrationPlan(
  input: readonly MigrationRow[],
  stagger = 0.12,
): MigrationPlan {
  const rows = input
    .filter(
      (row) =>
        typeof row?.year === 'number' &&
        Number.isFinite(row.year) &&
        isFiniteCount(row.legacy) &&
        isFiniteCount(row.modern),
    )
    .map((row) => ({ year: row.year, legacy: row.legacy, modern: row.modern }))
    .sort((a, b) => a.year - b.year);

  const segments: StackedSegment[] = [];
  let maxTotal = 0;

  for (const row of rows) {
    const total = row.legacy + row.modern;
    if (total > maxTotal) maxTotal = total;

    // Legacy sits on the baseline, modern stacks on top of it, so the visual
    // reading is "the dark block shrinking upward out of the stack".
    segments.push({
      key: `${row.year}-legacy`,
      year: row.year,
      band: 'legacy',
      y1: 0,
      y2: row.legacy,
      value: row.legacy,
    });
    segments.push({
      key: `${row.year}-modern`,
      year: row.year,
      band: 'modern',
      y1: row.legacy,
      y2: total,
      value: row.modern,
    });
  }

  const last = rows[rows.length - 1];
  const finalRatio: MigrationRatio = last
    ? {
        legacy: last.legacy,
        modern: last.modern,
        modernShare:
          last.legacy + last.modern > 0
            ? last.modern / (last.legacy + last.modern)
            : 0,
      }
    : EMPTY_RATIO;

  return {
    rows,
    segments,
    years: rows.map((row) => row.year),
    maxTotal: Math.max(1, maxTotal),
    finalRatio,
    stagger: Number.isFinite(stagger) && stagger > 0 ? stagger : 0,
  };
}

/**
 * Per-year local reveal progress at global `progress`. Year `i` opens at
 * `i * stagger` and takes the remaining span to finish, so the last bar lands
 * exactly at `progress === 1`.
 */
function localProgress(plan: MigrationPlan, index: number, progress: number) {
  const count = plan.years.length;
  if (count === 0) return 0;
  if (plan.stagger === 0) return clamp01(progress);

  const span = 1 + plan.stagger * (count - 1);
  const start = (plan.stagger * index) / span;
  const end = start + 1 / span;
  if (end <= start) return clamp01(progress);
  return clamp01((clamp01(progress) - start) / (end - start));
}

/**
 * Sample the plan at `progress` in [0, 1]. Each year's stack scales from the
 * baseline, so proportions within a stack stay truthful at every frame — a
 * half-grown bar is a scaled version of the real one, never a different ratio.
 * `progress >= 1` returns the plan's own segments unchanged.
 */
export function stateAt(
  plan: MigrationPlan,
  progress: number,
): readonly StackedSegment[] {
  const p = clamp01(progress);
  if (p >= 1) return plan.segments;

  const indexByYear = new Map(plan.years.map((year, index) => [year, index]));

  return plan.segments.map((segment) => {
    const scale = localProgress(plan, indexByYear.get(segment.year) ?? 0, p);
    return {
      ...segment,
      y1: segment.y1 * scale,
      y2: segment.y2 * scale,
    };
  });
}

/** `"36:73"` — the legacy:modern shorthand the migration write-up quotes. */
export function formatRatio(ratio: MigrationRatio): string {
  return `${ratio.legacy}:${ratio.modern}`;
}

/** Modern share as a whole-number percentage, for the headline stat tile. */
export function formatModernShare(ratio: MigrationRatio): string {
  return `${Math.round(ratio.modernShare * 100)}%`;
}
