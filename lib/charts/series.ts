/**
 * Series cardinality: keep the palette's worth of series and fold the rest into
 * one "Other" bucket.
 *
 * This is the answer to "I have more categories than colours". The alternative —
 * generating or cycling hues — breaks the palette's colourblind-safety guarantee,
 * which comes from a fixed order validated as a set. So cardinality is handled
 * here, in the data, before anything reaches a colour scale.
 */

import { SERIES_CAP } from './palette';

export interface SeriesTotal<TKey extends string = string> {
  key: TKey;
  total: number;
}

export interface FoldOptions {
  /**
   * How many named series to keep. Defaults to the adjacent-pairlist cap (8) —
   * correct for bars, stacks and lines. For scatter, bubble, choropleth or small
   * multiples pass `SERIES_CAP.allPairs`, because there any two marks can touch.
   */
  keep?: number;
  /** Label for the folded bucket. */
  otherLabel?: string;
  /**
   * Fold even when the series count only just exceeds `keep`. By default a
   * single leftover series is kept as itself rather than relabelled "Other",
   * which would hide a real name behind a bucket of one.
   */
  foldSingle?: boolean;
}

export interface FoldResult<TKey extends string = string> {
  /** Kept series, largest first, with the bucket last when present. */
  series: readonly SeriesTotal<string>[];
  /** Keys that were folded away, largest first. */
  folded: readonly TKey[];
  /** The bucket's label when one was created. */
  otherLabel: string | null;
}

/**
 * Rank series by total and keep the top `keep`, summing the remainder into one
 * bucket.
 *
 * Ranking is by total descending, then by key ascending so ties are stable and
 * the output is deterministic — two runs over the same data always produce the
 * same assignment, which matters because colour follows slot position.
 *
 * Note the consequence: this decides *which* series are named, so it must run
 * once over the full dataset, not per filter. Re-folding after a filter would
 * repaint the survivors, and colour must follow the entity rather than its rank.
 */
export function foldToOther<TKey extends string>(
  input: readonly SeriesTotal<TKey>[],
  {
    keep = SERIES_CAP.adjacent,
    otherLabel = 'OTHER',
    foldSingle = false,
  }: FoldOptions = {},
): FoldResult<TKey> {
  const limit = Math.max(0, Math.floor(keep));

  const clean = input
    .filter((s) => Number.isFinite(s.total))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));

  // Nothing to do, or folding would bucket a single named series for no gain.
  if (clean.length <= limit || (!foldSingle && clean.length === limit + 1)) {
    return { series: clean, folded: [], otherLabel: null };
  }

  const kept = clean.slice(0, limit);
  const rest = clean.slice(limit);
  const total = rest.reduce((sum, s) => sum + s.total, 0);

  return {
    series: [...kept, { key: otherLabel, total }],
    folded: rest.map((s) => s.key),
    otherLabel,
  };
}

/**
 * Totals per series key from arbitrary rows — the usual input to `foldToOther`.
 * Rows whose value is not finite are skipped rather than counted as zero.
 */
export function totalsBy<TRow, TKey extends string>(
  rows: readonly TRow[],
  key: (row: TRow) => TKey,
  value: (row: TRow) => number,
): SeriesTotal<TKey>[] {
  const totals = new Map<TKey, number>();
  for (const row of rows) {
    const v = value(row);
    if (!Number.isFinite(v)) continue;
    const k = key(row);
    totals.set(k, (totals.get(k) ?? 0) + v);
  }
  return [...totals].map(([k, total]) => ({ key: k, total }));
}

/**
 * Remap rows onto a folded series set: any key that was folded away is rewritten
 * to the bucket label, so the rows and the colour assignment agree.
 */
export function applyFold<TRow, TKey extends string>(
  rows: readonly TRow[],
  fold: FoldResult<TKey>,
  key: (row: TRow) => TKey,
  relabel: (row: TRow, label: string) => TRow,
): TRow[] {
  if (!fold.otherLabel) return [...rows];
  const folded = new Set<string>(fold.folded);
  return rows.map((row) =>
    folded.has(key(row)) ? relabel(row, fold.otherLabel as string) : row,
  );
}
