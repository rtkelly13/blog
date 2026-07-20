import { describe, expect, it } from 'vitest';
import { depFrameAt, depTotal } from '../components/interactive/DepResolve';
import { mvuFrameAt } from '../components/interactive/MvuLoop';
import {
  type RailConfig,
  railFrameAt,
  railTotal,
} from '../components/interactive/RailwayTrack';

describe('railFrameAt', () => {
  const cfg: RailConfig = {
    steps: [
      { label: 'validate', op: 'bind' },
      { label: 'parse', op: 'bind' },
      { label: 'save', op: 'bind' },
      { label: 'format', op: 'map' },
    ],
    failAt: 2,
  };

  it('stays on the success rail before the failing step', () => {
    const f = railFrameAt(0.3, cfg);
    expect(f.rail).toBe('success');
    expect(f.value).toBe('Ok');
  });

  it('switches to the failure rail at the failing step and stays there', () => {
    const total = railTotal(cfg);
    const end = railFrameAt(total, cfg);
    expect(end.rail).toBe('failure');
    expect(end.value).toBe('Error');
    expect(end.done).toBe(true);
  });

  it('never leaves the success rail for an all-success run', () => {
    const ok: RailConfig = { ...cfg, failAt: -1 };
    for (let t = 0; t <= railTotal(ok); t += 0.1) {
      expect(railFrameAt(t, ok).rail).toBe('success');
    }
  });

  it('advances the active step monotonically', () => {
    let prev = -1;
    for (let t = 0; t <= railTotal(cfg); t += 0.1) {
      const s = railFrameAt(t, cfg).activeStep;
      expect(s).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = Math.max(prev, s);
    }
  });
});

describe('mvuFrameAt', () => {
  it('cycles model -> view -> update -> model', () => {
    expect(mvuFrameAt(0.1).active).toBe('view'); // model->view edge
    expect(mvuFrameAt(1.3).active).toBe('update'); // view->update
    expect(mvuFrameAt(2.5).active).toBe('model'); // update->model
  });

  it('increments the model once per lap', () => {
    const lapStartValue = mvuFrameAt(0.1).modelValue;
    const nextLapValue = mvuFrameAt(3.4).modelValue; // into second lap
    expect(nextLapValue).toBeGreaterThan(lapStartValue);
  });

  it('carries a message only on the view->update edge', () => {
    expect(mvuFrameAt(1.3).message).not.toBeNull();
    expect(mvuFrameAt(0.1).message).toBeNull();
  });
});

describe('depFrameAt', () => {
  it('walks phases graph -> conflict -> resolve -> locked', () => {
    expect(depFrameAt(0.5).phase).toBe('graph');
    expect(depFrameAt(2.5).phase).toBe('conflict');
    expect(depFrameAt(4.5).phase).toBe('resolve');
    expect(depFrameAt(depTotal()).phase).toBe('locked');
  });

  it('ramps resolveProgress 0 -> 1 across the resolve phase', () => {
    expect(depFrameAt(2.5).resolveProgress).toBe(0);
    const mid = depFrameAt(4.4).resolveProgress;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThanOrEqual(1);
    expect(depFrameAt(depTotal()).resolveProgress).toBe(1);
  });

  it('writes the lock only once locked', () => {
    expect(depFrameAt(4.5).lockWritten).toBe(false);
    expect(depFrameAt(depTotal()).lockWritten).toBe(true);
  });
});
