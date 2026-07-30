import { describe, expect, it } from 'vitest';
import {
  buildMigrationPlan,
  formatModernShare,
  formatRatio,
  type MigrationRow,
  stateAt,
} from '../components/interactive/migrationRatioModel';

const ROWS: MigrationRow[] = [
  { year: 2019, legacy: 88, modern: 9 },
  { year: 2022, legacy: 61, modern: 43 },
  { year: 2025, legacy: 36, modern: 73 },
];

describe('buildMigrationPlan', () => {
  const plan = buildMigrationPlan(ROWS);

  it('is reproducible for the same rows', () => {
    expect(buildMigrationPlan(ROWS)).toEqual(buildMigrationPlan(ROWS));
  });

  it('emits a legacy and a modern segment per year', () => {
    expect(plan.segments).toHaveLength(ROWS.length * 2);
    expect(plan.segments.filter((s) => s.band === 'legacy')).toHaveLength(3);
    expect(plan.segments.filter((s) => s.band === 'modern')).toHaveLength(3);
  });

  it('stacks modern directly on top of legacy with no gap or overlap', () => {
    for (const row of ROWS) {
      const legacy = plan.segments.find(
        (s) => s.year === row.year && s.band === 'legacy',
      );
      const modern = plan.segments.find(
        (s) => s.year === row.year && s.band === 'modern',
      );
      expect(legacy).toMatchObject({ y1: 0, y2: row.legacy });
      expect(modern).toMatchObject({
        y1: row.legacy,
        y2: row.legacy + row.modern,
      });
    }
  });

  it('keeps each segment value independent of its stack position', () => {
    const modern2025 = plan.segments.find(
      (s) => s.year === 2025 && s.band === 'modern',
    );
    expect(modern2025?.value).toBe(73);
    expect(modern2025?.y1).toBe(36);
  });

  it('sorts rows by year regardless of input order', () => {
    const shuffled = buildMigrationPlan([ROWS[2], ROWS[0], ROWS[1]]);
    expect(shuffled.years).toEqual([2019, 2022, 2025]);
    expect(shuffled).toEqual(plan);
  });

  it('takes maxTotal from the tallest stack', () => {
    expect(plan.maxTotal).toBe(109);
  });

  it('reports the final year as the ratio', () => {
    expect(plan.finalRatio).toEqual({
      legacy: 36,
      modern: 73,
      modernShare: 73 / 109,
    });
  });

  it('drops rows with a non-finite year or a negative/NaN count', () => {
    const dirty = buildMigrationPlan([
      ...ROWS,
      { year: Number.NaN, legacy: 5, modern: 5 },
      { year: 2026, legacy: -1, modern: 5 },
      { year: 2027, legacy: 5, modern: Number.NaN },
    ]);
    expect(dirty.years).toEqual([2019, 2022, 2025]);
  });

  it('survives an empty input without collapsing the scale', () => {
    const empty = buildMigrationPlan([]);
    expect(empty.segments).toEqual([]);
    expect(empty.years).toEqual([]);
    expect(empty.maxTotal).toBe(1);
    expect(empty.finalRatio).toEqual({ legacy: 0, modern: 0, modernShare: 0 });
  });

  it('treats a zero-total final year as zero modern share, not NaN', () => {
    const flat = buildMigrationPlan([{ year: 2030, legacy: 0, modern: 0 }]);
    expect(flat.finalRatio.modernShare).toBe(0);
  });
});

describe('stateAt', () => {
  const plan = buildMigrationPlan(ROWS);

  it('returns the plan segments unchanged once complete', () => {
    expect(stateAt(plan, 1)).toBe(plan.segments);
    expect(stateAt(plan, 5)).toBe(plan.segments);
  });

  it('collapses every bar to the baseline at zero', () => {
    for (const segment of stateAt(plan, 0)) {
      expect(segment.y1).toBe(0);
      expect(segment.y2).toBe(0);
    }
  });

  it('clamps negative and non-finite progress to the start', () => {
    expect(stateAt(plan, -1).every((s) => s.y2 === 0)).toBe(true);
    expect(stateAt(plan, Number.NaN).every((s) => s.y2 === 0)).toBe(true);
  });

  it('preserves the legacy:modern proportion at every frame', () => {
    // A half-grown bar must be a scaled version of the real one — a partial
    // reveal should never imply a ratio the data does not contain.
    for (const progress of [0.2, 0.45, 0.7, 0.95]) {
      const frame = stateAt(plan, progress);
      const legacy = frame.find((s) => s.year === 2025 && s.band === 'legacy');
      const modern = frame.find((s) => s.year === 2025 && s.band === 'modern');
      if (!legacy || !modern || modern.y2 === 0) continue;
      expect(legacy.y2 / modern.y2).toBeCloseTo(36 / 109, 10);
    }
  });

  it('keeps the stack contiguous while growing', () => {
    for (const segment of stateAt(plan, 0.6)) {
      if (segment.band !== 'modern') continue;
      const legacy = stateAt(plan, 0.6).find(
        (s) => s.year === segment.year && s.band === 'legacy',
      );
      expect(segment.y1).toBeCloseTo(legacy?.y2 ?? -1, 10);
    }
  });

  it('never exceeds the finished geometry', () => {
    for (const progress of [0, 0.3, 0.6, 0.9, 1]) {
      const frame = stateAt(plan, progress);
      frame.forEach((segment, i) => {
        expect(segment.y2).toBeLessThanOrEqual(plan.segments[i].y2 + 1e-9);
      });
    }
  });

  it('staggers years so earlier bars lead', () => {
    const frame = stateAt(plan, 0.25);
    const first = frame.find((s) => s.year === 2019 && s.band === 'legacy');
    const last = frame.find((s) => s.year === 2025 && s.band === 'legacy');
    const firstShare = (first?.y2 ?? 0) / 88;
    const lastShare = (last?.y2 ?? 0) / 36;
    expect(firstShare).toBeGreaterThan(lastShare);
  });

  it('lands every bar exactly at full height when progress reaches 1', () => {
    // The last year opens last, so it is the one at risk of being cut short.
    const nearlyDone = stateAt(plan, 0.999);
    const last = nearlyDone.find((s) => s.year === 2025 && s.band === 'modern');
    expect(last?.y2).toBeGreaterThan(100);
  });

  it('reveals all years together when stagger is zero', () => {
    const flat = buildMigrationPlan(ROWS, 0);
    const frame = stateAt(flat, 0.5);
    const first = frame.find((s) => s.year === 2019 && s.band === 'legacy');
    const last = frame.find((s) => s.year === 2025 && s.band === 'legacy');
    expect((first?.y2 ?? 0) / 88).toBeCloseTo((last?.y2 ?? 0) / 36, 10);
  });

  it('ignores a non-finite stagger', () => {
    expect(buildMigrationPlan(ROWS, Number.NaN).stagger).toBe(0);
    expect(buildMigrationPlan(ROWS, -2).stagger).toBe(0);
  });
});

describe('formatters', () => {
  const plan = buildMigrationPlan(ROWS);

  it('renders the legacy:modern shorthand', () => {
    expect(formatRatio(plan.finalRatio)).toBe('36:73');
  });

  it('renders modern share as a whole percentage', () => {
    expect(formatModernShare(plan.finalRatio)).toBe('67%');
  });
});
