import { describe, expect, it } from 'vitest';
import {
  buildRun,
  mulberry32,
  phaseTimes,
  stateAt,
} from '../components/interactive/mapReduceModel';

const CONFIG = { mappers: 8, seed: 42, slots: 4, spotReclaim: true };

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
  const plan = buildRun(CONFIG);

  it('is reproducible for the same config', () => {
    expect(buildRun(CONFIG)).toEqual(buildRun(CONFIG));
  });

  it('creates prepare + N maps + reduce', () => {
    expect(plan.jobs).toHaveLength(CONFIG.mappers + 2);
    expect(plan.jobs[0].kind).toBe('prepare');
    expect(plan.jobs.filter((j) => j.kind === 'map')).toHaveLength(
      CONFIG.mappers,
    );
    expect(plan.jobs[plan.jobs.length - 1].kind).toBe('reduce');
  });

  it('runs prepare alone before any map starts', () => {
    const firstMapStart = Math.min(
      ...plan.jobs
        .filter((j) => j.kind === 'map')
        .map((j) => j.segments[0].start),
    );
    expect(firstMapStart).toBeGreaterThan(plan.prepareEnd - 1e-9);
  });

  it('starts the reduce only after every map has finished', () => {
    const lastMapEnd = Math.max(
      ...plan.jobs.filter((j) => j.kind === 'map').map((j) => j.end),
    );
    expect(plan.reduceStart).toBeGreaterThan(lastMapEnd - 1e-9);
    expect(plan.total).toBeGreaterThan(plan.reduceEnd - 1e-9);
  });

  it('never runs more jobs than there are slots', () => {
    const segments = plan.jobs.flatMap((j) => j.segments);
    for (let t = 0; t <= plan.total; t += 0.05) {
      const running = segments.filter((s) => t >= s.start && t < s.end);
      expect(running.length).toBeLessThanOrEqual(CONFIG.slots);
      // No two concurrent segments share a slot.
      const usedSlots = running.map((s) => s.slot);
      expect(new Set(usedSlots).size).toBe(usedSlots.length);
    }
  });

  it('reclaims exactly one map when spotReclaim is on, none when off', () => {
    const reclaimed = plan.jobs.filter((j) => j.hasReclaim);
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0].kind).toBe('map');
    expect(reclaimed[0].segments).toHaveLength(2);
    expect(reclaimed[0].segments[0].completes).toBe(false);
    expect(reclaimed[0].segments[1].completes).toBe(true);
    expect(reclaimed[0].segments[1].start).toBeGreaterThan(
      reclaimed[0].segments[0].end,
    );

    const without = buildRun({ ...CONFIG, spotReclaim: false });
    expect(without.jobs.filter((j) => j.hasReclaim)).toHaveLength(0);
    for (const j of without.jobs) {
      expect(j.segments).toHaveLength(1);
      expect(j.segments[0].completes).toBe(true);
    }
  });

  it('queues maps when there are more maps than slots', () => {
    // With 8 maps and 4 slots at least one map must wait for a slot: its
    // start is later than its readyAt + pickup latency.
    const waits = plan.jobs
      .filter((j) => j.kind === 'map')
      .map((j) => j.segments[0].start - j.readyAt);
    expect(Math.max(...waits)).toBeGreaterThan(0.5);
  });
});

describe('stateAt', () => {
  const plan = buildRun(CONFIG);

  it('walks phases in order: idle → prepare → map → reduce → done', () => {
    expect(stateAt(plan, 0).phase).toBe('idle');
    expect(stateAt(plan, plan.prepareEnd / 2).phase).toBe('prepare');
    expect(stateAt(plan, (plan.prepareEnd + plan.reduceStart) / 2).phase).toBe(
      'map',
    );
    expect(stateAt(plan, (plan.reduceStart + plan.reduceEnd) / 2).phase).toBe(
      'reduce',
    );
    expect(stateAt(plan, plan.total).phase).toBe('done');
  });

  it('marks maps pending until prepare completes', () => {
    const mid = stateAt(plan, plan.prepareEnd / 2);
    for (const j of mid.jobs) {
      if (j.kind === 'map') expect(j.status).toBe('pending');
    }
  });

  it('never occupies a slot with two jobs and never exceeds capacity', () => {
    for (let t = 0; t <= plan.total; t += 0.05) {
      const frame = stateAt(plan, t);
      const occupants = frame.slots.filter((s) => s !== undefined);
      expect(new Set(occupants).size).toBe(occupants.length);
      const running = frame.jobs.filter((j) => j.status === 'running');
      expect(running.length).toBeLessThanOrEqual(plan.config.slots);
      for (const j of running) {
        expect(j.slot).toBeDefined();
        if (j.slot !== undefined) expect(frame.slots[j.slot]).toBe(j.id);
      }
    }
  });

  it('never lets reduce progress start before all maps are done', () => {
    for (let t = 0; t <= plan.total; t += 0.05) {
      const frame = stateAt(plan, t);
      if (frame.reduceProgress > 0) {
        expect(frame.completedMaps).toBe(CONFIG.mappers);
      }
    }
  });

  it('surfaces the reclaim as running → requeued → running → done', () => {
    const reclaimed = plan.jobs.find((j) => j.hasReclaim);
    expect(reclaimed).toBeDefined();
    if (!reclaimed) return;
    const [fail, retry] = reclaimed.segments;
    const at = (t: number) =>
      stateAt(plan, t).jobs.find((j) => j.id === reclaimed.id)?.status;
    expect(at((fail.start + fail.end) / 2)).toBe('running');
    expect(at(fail.end + 0.05)).toBe('requeued');
    expect(at((retry.start + retry.end) / 2)).toBe('running');
    expect(at(reclaimed.end)).toBe('done');
  });

  it('ends with everything done and the queue empty', () => {
    const frame = stateAt(plan, plan.total);
    expect(frame.jobs.every((j) => j.status === 'done')).toBe(true);
    expect(frame.queue).toHaveLength(0);
    expect(frame.completedMaps).toBe(CONFIG.mappers);
    expect(frame.reduceProgress).toBe(1);
  });
});

describe('phaseTimes', () => {
  it('returns times that land inside their phase', () => {
    const plan = buildRun(CONFIG);
    const times = phaseTimes(plan);
    expect(stateAt(plan, times.prepare).phase).toBe('prepare');
    expect(stateAt(plan, times.map).phase).toBe('map');
    expect(stateAt(plan, times.reduce).phase).toBe('reduce');
    expect(stateAt(plan, times.done).phase).toBe('done');
  });
});
