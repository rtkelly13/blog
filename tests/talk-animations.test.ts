import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  depFrameAt,
  depTotal,
} from '../components/interactive/depResolveModel';
import { LAP, mvuFrameAt } from '../components/interactive/mvuLoopModel';
import {
  type RailConfig,
  railFrameAt,
  railTotal,
} from '../components/interactive/railwayTrackModel';

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

/* ── the frame contract ───────────────────────────────────────────────────── */

/**
 * What a renderer relies on, none of which was previously asserted.
 *
 * These three models are functions of continuous time, which is the strongest
 * shape in `components/interactive/` — stronger than `terminalEngine`'s discrete
 * `(eventIdx, progress)`, because `t` maps straight to `frame / fps` with no
 * schedule in between. The tests below pin that rather than assuming it.
 *
 * The golden hashes cover 8000 sampled frames per model and exist because this
 * extraction was a file move: they are what made "no behaviour change"
 * checkable rather than asserted. Regenerate deliberately —
 *
 *     UPDATE_TALK_GOLDENS=1 pnpm vitest run tests/talk-animations.test.ts
 */
const GOLDEN_PATH = join(__dirname, 'fixtures', 'talk-animation-goldens.json');

const GOLDEN_CFGS: RailConfig[] = [
  {
    steps: [
      { label: 'a', op: 'bind' },
      { label: 'b', op: 'bind' },
      { label: 'c', op: 'map' },
    ],
    failAt: 1,
  },
  {
    steps: [
      { label: 'a', op: 'bind' },
      { label: 'b', op: 'map' },
    ],
    failAt: -1,
  },
];

const sweep = (n: number, hi: number, f: (t: number) => unknown) =>
  Array.from({ length: n }, (_, i) => f((i / n) * hi));

const hash = (v: unknown) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);

describe('frame goldens', () => {
  const actual: Record<string, string> = {
    dep: hash(sweep(2000, depTotal() * 1.3, depFrameAt)),
    mvu: hash(sweep(2000, 12, mvuFrameAt)),
  };
  GOLDEN_CFGS.forEach((cfg, i) => {
    actual[`rail${i}`] = hash(
      sweep(2000, railTotal(cfg) * 1.3, (t) => railFrameAt(t, cfg)),
    );
  });

  if (process.env.UPDATE_TALK_GOLDENS === '1') {
    writeFileSync(GOLDEN_PATH, `${JSON.stringify(actual, null, 2)}\n`);
  }
  const golden: Record<string, string> = JSON.parse(
    readFileSync(GOLDEN_PATH, 'utf8'),
  );

  it.each(Object.keys(actual).sort())('%s is unchanged', (key) => {
    expect(actual[key]).toBe(golden[key]);
  });
});

describe('frame contract', () => {
  const models: [string, (t: number) => unknown, number][] = [
    ['depFrameAt', depFrameAt, depTotal()],
    ['mvuFrameAt', mvuFrameAt, LAP * 3],
    [
      'railFrameAt',
      (t) => railFrameAt(t, GOLDEN_CFGS[0]),
      railTotal(GOLDEN_CFGS[0]),
    ],
  ];

  it.each(models)('%s: same t gives the same frame', (_n, f, total) => {
    for (let i = 0; i <= 200; i++) {
      const t = (i / 200) * total;
      expect(f(t)).toEqual(f(t));
    }
  });

  it.each(models)('%s: seeking equals stepping', (_n, f, total) => {
    // The property a frame renderer needs: no call depends on having been
    // called for the previous frame. Walking forward and jumping straight in
    // must agree, or a seek mid-render produces a frame playback never shows.
    const stepped = Array.from({ length: 200 }, (_, i) => f((i / 200) * total));
    const jumped = Array.from({ length: 200 }, (_, i) => i)
      .reverse()
      .map((i) => [i, f((i / 200) * total)] as const)
      .sort((a, b) => a[0] - b[0])
      .map(([, frame]) => frame);
    expect(jumped).toEqual(stepped);
  });

  it.each(models)(
    '%s: t=0 is stable, so a render starts on the still',
    (_n, f) => {
      expect(f(0)).toEqual(f(0));
      expect(f(0)).not.toBeUndefined();
    },
  );

  it('finite runs clamp past the end rather than wrapping', () => {
    // Explicit because a renderer overshooting the last frame must hold the
    // final state, not restart. Emergent before; stated now.
    const end = depFrameAt(depTotal());
    expect(depFrameAt(depTotal() * 5)).toEqual(end);
    expect(end.phase).toBe('locked');

    const cfg = GOLDEN_CFGS[0];
    const railEnd = railFrameAt(railTotal(cfg), cfg);
    expect(railFrameAt(railTotal(cfg) * 5, cfg)).toEqual(railEnd);
    expect(railEnd.done).toBe(true);
  });

  it('the MVU loop is periodic, and says so', () => {
    // The one model that legitimately wraps: it is a loop, so every lap is the
    // same except for the counter it carries.
    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * LAP;
      const a = mvuFrameAt(t);
      const b = mvuFrameAt(t + LAP);
      expect(b.edge).toBe(a.edge);
      expect(b.active).toBe(a.active);
      expect(b.progress).toBeCloseTo(a.progress, 10);
      expect(b.modelValue).toBe(a.modelValue + 1);
    }
  });

  it('no model emits NaN anywhere in its run', () => {
    // `null` is not checked: `mvuFrameAt` returns `message: null` on every edge
    // except view->update, which is the documented shape rather than a hole.
    for (const [name, f, total] of models) {
      for (let i = 0; i <= 300; i++) {
        const frame = f((i / 300) * total * 1.2) as Record<string, unknown>;
        for (const [key, value] of Object.entries(frame)) {
          if (typeof value === 'number') {
            expect(Number.isFinite(value), `${name}.${key}`).toBe(true);
          }
        }
      }
    }
  });
});
