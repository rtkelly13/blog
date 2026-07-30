import { describe, expect, it } from 'vitest';
import { SERIES_CAP } from '../lib/charts/palette';
import {
  applyFold,
  foldToOther,
  type SeriesTotal,
  totalsBy,
} from '../lib/charts/series';

const mk = (pairs: [string, number][]): SeriesTotal[] =>
  pairs.map(([key, total]) => ({ key, total }));

// 11 series against an 8-slot palette — the case that motivates folding.
const MANY = mk([
  ['a', 100],
  ['b', 90],
  ['c', 80],
  ['d', 70],
  ['e', 60],
  ['f', 50],
  ['g', 40],
  ['h', 30],
  ['i', 20],
  ['j', 10],
  ['k', 5],
]);

describe('foldToOther', () => {
  it('defaults to the adjacent-pairlist cap', () => {
    const { series, otherLabel } = foldToOther(MANY);
    // keep + 1 entries: the bucket is an extra series, but it does NOT consume a
    // palette slot — it paints from --ts-chart-other. So the palette still only
    // has to supply SERIES_CAP.adjacent identity colours.
    expect(series).toHaveLength(SERIES_CAP.adjacent + 1);
    expect(
      series.slice(0, SERIES_CAP.adjacent).map((s) => s.key),
    ).not.toContain(otherLabel);
    expect(series[SERIES_CAP.adjacent].key).toBe(otherLabel);
  });

  it('keeps the top N and sums the tail into one bucket', () => {
    const { series, folded, otherLabel } = foldToOther(MANY, { keep: 8 });
    expect(series.slice(0, 8).map((s) => s.key)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
    ]);
    expect(series[7].key).toBe('h');
    expect(folded).toEqual(['i', 'j', 'k']);
    expect(otherLabel).toBe('OTHER');
  });

  it('conserves the grand total', () => {
    const before = MANY.reduce((s, x) => s + x.total, 0);
    const after = foldToOther(MANY).series.reduce((s, x) => s + x.total, 0);
    expect(after).toBe(before);
  });

  it('puts the bucket last so it never takes a leading colour slot', () => {
    // The bucket must land past the named series even when it outweighs them.
    const lopsided = mk([
      ['big', 1],
      ['x', 5],
      ['y', 5],
      ['z', 5],
    ]);
    const { series } = foldToOther(lopsided, { keep: 1, foldSingle: true });
    expect(series[0].key).toBe('x'); // x/y/z tie on 5; key ascending picks x
    expect(series[series.length - 1]).toEqual({ key: 'OTHER', total: 11 });
  });

  it('honours the much lower all-pairs cap', () => {
    const { series, folded } = foldToOther(MANY, { keep: SERIES_CAP.allPairs });
    expect(series).toHaveLength(SERIES_CAP.allPairs + 1);
    expect(folded).toHaveLength(MANY.length - SERIES_CAP.allPairs);
  });

  it('does nothing when the series already fit', () => {
    const few = MANY.slice(0, 5);
    const { series, folded, otherLabel } = foldToOther(few, { keep: 8 });
    expect(series).toHaveLength(5);
    expect(folded).toEqual([]);
    expect(otherLabel).toBeNull();
  });

  it('keeps a lone leftover as itself rather than a bucket of one', () => {
    const nine = MANY.slice(0, 9);
    const { series, otherLabel } = foldToOther(nine, { keep: 8 });
    expect(series).toHaveLength(9);
    expect(otherLabel).toBeNull();
    expect(series.map((s) => s.key)).toContain('i');
  });

  it('folds the lone leftover when explicitly asked', () => {
    const { series, folded } = foldToOther(MANY.slice(0, 9), {
      keep: 8,
      foldSingle: true,
    });
    expect(series).toHaveLength(9);
    expect(folded).toEqual(['i']);
    expect(series[8]).toEqual({ key: 'OTHER', total: 20 });
  });

  it('is deterministic, breaking ties by key', () => {
    const ties = mk([
      ['zebra', 10],
      ['apple', 10],
      ['mango', 10],
    ]);
    const once = foldToOther(ties, { keep: 2, foldSingle: true });
    const twice = foldToOther([...ties].reverse(), {
      keep: 2,
      foldSingle: true,
    });
    expect(once).toEqual(twice);
    expect(once.series.map((s) => s.key)).toEqual(['apple', 'mango', 'OTHER']);
  });

  it('drops non-finite totals instead of counting them as zero', () => {
    const dirty = mk([
      ['a', 10],
      ['b', Number.NaN],
      ['c', Number.POSITIVE_INFINITY],
      ['d', 5],
    ]);
    expect(foldToOther(dirty, { keep: 8 }).series.map((s) => s.key)).toEqual([
      'a',
      'd',
    ]);
  });

  it('takes a custom bucket label', () => {
    const { series, otherLabel } = foldToOther(MANY, { otherLabel: 'REST' });
    expect(otherLabel).toBe('REST');
    expect(series[series.length - 1].key).toBe('REST');
  });

  it('survives empty input and a zero cap', () => {
    expect(foldToOther([]).series).toEqual([]);
    const all = foldToOther(MANY, { keep: 0, foldSingle: true });
    expect(all.series).toHaveLength(1);
    expect(all.series[0].total).toBe(555);
  });
});

describe('totalsBy', () => {
  const rows = [
    { team: 'red', n: 3 },
    { team: 'blue', n: 4 },
    { team: 'red', n: 5 },
    { team: 'blue', n: Number.NaN },
  ];

  it('sums per key, skipping non-finite values', () => {
    const totals = totalsBy(
      rows,
      (r) => r.team,
      (r) => r.n,
    );
    expect(totals.sort((a, b) => a.key.localeCompare(b.key))).toEqual([
      { key: 'blue', total: 4 },
      { key: 'red', total: 8 },
    ]);
  });

  it('feeds foldToOther directly', () => {
    const { series } = foldToOther(
      totalsBy(
        rows,
        (r) => r.team,
        (r) => r.n,
      ),
      { keep: 1, foldSingle: true },
    );
    expect(series).toEqual([
      { key: 'red', total: 8 },
      { key: 'OTHER', total: 4 },
    ]);
  });
});

describe('applyFold', () => {
  const rows = [
    { team: 'a', v: 1 },
    { team: 'i', v: 2 },
    { team: 'k', v: 3 },
  ];
  const relabel = (row: { team: string; v: number }, label: string) => ({
    ...row,
    team: label,
  });

  it('rewrites folded keys so rows and colour assignment agree', () => {
    const fold = foldToOther(MANY, { keep: 8 });
    const out = applyFold(rows, fold, (r) => r.team, relabel);
    expect(out.map((r) => r.team)).toEqual(['a', 'OTHER', 'OTHER']);
    expect(out.map((r) => r.v)).toEqual([1, 2, 3]);
  });

  it('returns a copy untouched when nothing was folded', () => {
    const fold = foldToOther(MANY.slice(0, 3), { keep: 8 });
    const out = applyFold(rows, fold, (r) => r.team, relabel);
    expect(out).toEqual(rows);
    expect(out).not.toBe(rows);
  });
});
