import { describe, expect, it } from 'vitest';
import {
  buildRun,
  mulberry32,
  phaseTimes,
  stateAt,
} from '../components/interactive/mapReduceModel';

const CONFIG = { mappers: 8, seed: 42, spotReclaim: true };

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('stays within [0, 1)', () => {
    const rand = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const x = rand();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('buildRun', () => {
  it('is reproducible for the same config', () => {
    expect(buildRun(CONFIG)).toEqual(buildRun(CONFIG));
  });

  it('creates one plan per mapper, all starting after the split', () => {
    const plan = buildRun(CONFIG);
    expect(plan.mappers).toHaveLength(CONFIG.mappers);
    for (const m of plan.mappers) {
      expect(m.start).toBeGreaterThanOrEqual(plan.splitDuration);
      expect(m.end).toBeGreaterThan(m.start);
    }
  });

  it('starts the reduce only after every mapper has finished', () => {
    const plan = buildRun(CONFIG);
    const lastMapperEnd = Math.max(...plan.mappers.map((m) => m.end));
    expect(plan.reduceStart).toBeGreaterThan(lastMapperEnd - 1e-9);
    expect(plan.total).toBeGreaterThan(
      plan.reduceStart + plan.reduceDuration - 1e-9,
    );
  });

  it('reclaims exactly one mapper when spotReclaim is on, none when off', () => {
    const withReclaim = buildRun(CONFIG);
    expect(
      withReclaim.mappers.filter((m) => m.reclaimAt !== undefined),
    ).toHaveLength(1);

    const without = buildRun({ ...CONFIG, spotReclaim: false });
    expect(
      without.mappers.filter((m) => m.reclaimAt !== undefined),
    ).toHaveLength(0);
  });

  it('schedules the retry after the reclaim, ending later than the reclaim', () => {
    const plan = buildRun(CONFIG);
    const reclaimed = plan.mappers.find((m) => m.reclaimAt !== undefined);
    expect(reclaimed).toBeDefined();
    if (!reclaimed?.reclaimAt || !reclaimed.retryStart) return;
    expect(reclaimed.retryStart).toBeGreaterThan(reclaimed.reclaimAt);
    expect(reclaimed.end).toBeGreaterThan(reclaimed.retryStart);
  });
});

describe('stateAt', () => {
  const plan = buildRun(CONFIG);

  it('walks phases in order: idle → split → map → reduce → done', () => {
    expect(stateAt(plan, 0).phase).toBe('idle');
    expect(stateAt(plan, plan.splitDuration / 2).phase).toBe('split');
    expect(stateAt(plan, (plan.mapStart + plan.reduceStart) / 2).phase).toBe(
      'map',
    );
    expect(
      stateAt(plan, plan.reduceStart + plan.reduceDuration / 2).phase,
    ).toBe('reduce');
    expect(stateAt(plan, plan.total).phase).toBe('done');
  });

  it('never lets reduce progress start before all mappers are done', () => {
    for (let t = 0; t <= plan.total; t += 0.05) {
      const frame = stateAt(plan, t);
      if (frame.reduceProgress > 0) {
        expect(frame.completedMappers).toBe(CONFIG.mappers);
      }
    }
  });

  it('keeps every mapper progress within [0, 1] and monotonic per attempt', () => {
    let prev = stateAt(plan, 0);
    for (let t = 0.02; t <= plan.total; t += 0.02) {
      const frame = stateAt(plan, t);
      for (const m of frame.mappers) {
        expect(m.progress).toBeGreaterThanOrEqual(0);
        expect(m.progress).toBeLessThanOrEqual(1);
        const before = prev.mappers[m.index];
        // Progress may only reset at the reclaim boundary; otherwise it climbs.
        if (before.status === m.status) {
          expect(m.progress).toBeGreaterThanOrEqual(before.progress - 1e-9);
        }
      }
      prev = frame;
    }
  });

  it('surfaces the reclaim as reclaimed → retrying → done', () => {
    const reclaimedPlan = plan.mappers.find((m) => m.reclaimAt !== undefined);
    expect(reclaimedPlan).toBeDefined();
    if (!reclaimedPlan?.reclaimAt || !reclaimedPlan.retryStart) return;
    const idx = reclaimedPlan.index;
    expect(
      stateAt(plan, reclaimedPlan.reclaimAt + 0.1).mappers[idx].status,
    ).toBe('reclaimed');
    expect(
      stateAt(plan, reclaimedPlan.retryStart + 0.1).mappers[idx].status,
    ).toBe('retrying');
    expect(stateAt(plan, reclaimedPlan.end).mappers[idx].status).toBe('done');
  });

  it('ends with everything complete', () => {
    const frame = stateAt(plan, plan.total);
    expect(frame.completedMappers).toBe(CONFIG.mappers);
    expect(frame.splitProgress).toBe(1);
    expect(frame.reduceProgress).toBe(1);
  });
});

describe('phaseTimes', () => {
  it('returns times that land inside their phase', () => {
    const plan = buildRun(CONFIG);
    const times = phaseTimes(plan);
    expect(stateAt(plan, times.split).phase).toBe('split');
    expect(stateAt(plan, times.map).phase).toBe('map');
    expect(stateAt(plan, times.reduce).phase).toBe('reduce');
    expect(stateAt(plan, times.done).phase).toBe('done');
  });
});
