/**
 * Two contracts for `components/graphics/`, tested separately because they are
 * genuinely different properties and only one of them existed before.
 *
 *  1. **Determinism** — same params ⇒ byte-identical SVG. `rng.ts` has always
 *     claimed this; nothing asserted it. The golden file below pins the exact
 *     output of every generator across a seed × density matrix, which is what
 *     makes the sample/project refactor safe: the split is only correct if not
 *     one byte moves at `t = 0`.
 *
 *  2. **Coherence** — adjacent `t` values ⇒ adjacent images. This is the new
 *     property, and the one animation actually needs. Determinism does not
 *     imply it: a generator can be perfectly reproducible frame by frame and
 *     still re-roll its whole composition between frames, which renders as
 *     confetti rather than as motion.
 *
 * Regenerate the goldens deliberately, never silently:
 *
 *     UPDATE_GRAPHICS_GOLDENS=1 pnpm vitest run tests/graphics-generators.test.ts
 *
 * A diff here means rendering changed. That is sometimes correct — but it is
 * never incidental, and the whole point of committing hashes is that it cannot
 * happen without someone saying so.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GENERATOR_LIST, renderGraphic } from '../components/graphics/registry';
import type { GraphicParams } from '../components/graphics/types';

const GOLDEN_PATH = join(__dirname, 'fixtures', 'graphics-goldens.json');
const UPDATING = process.env.UPDATE_GRAPHICS_GOLDENS === '1';

const NAMES = GENERATOR_LIST.map((g) => g.name).sort();
const SEEDS = [1, 7, 42];
const DENSITIES = [0.2, 0.5, 0.9];

/** Every param pinned, so a change to a generator's `defaults` cannot move a golden. */
function params(over: Partial<GraphicParams> = {}): GraphicParams {
  return {
    width: 1280,
    height: 720,
    seed: 1,
    accent: '#22d3ee',
    background: 'transparent',
    density: 0.5,
    opacity: 1,
    strokeWidth: 2,
    t: 0,
    ...over,
  };
}

const sha = (s: string) =>
  createHash('sha256').update(s).digest('hex').slice(0, 16);

describe('generator determinism (golden)', () => {
  const actual: Record<string, string> = {};
  for (const name of NAMES) {
    for (const seed of SEEDS) {
      for (const density of DENSITIES) {
        actual[`${name}|seed=${seed}|density=${density}`] = sha(
          renderGraphic(name, params({ seed, density })),
        );
      }
    }
  }

  if (UPDATING) {
    writeFileSync(GOLDEN_PATH, `${JSON.stringify(actual, null, 2)}\n`);
  }

  const golden: Record<string, string> = JSON.parse(
    readFileSync(GOLDEN_PATH, 'utf8'),
  );

  it('covers every registered generator', () => {
    // Catches the reverse failure too: a golden for a generator that no longer
    // exists is a test asserting nothing.
    expect(Object.keys(actual).sort()).toEqual(Object.keys(golden).sort());
  });

  it.each(Object.keys(actual).sort())('%s renders byte-identically', (key) => {
    expect(actual[key]).toBe(golden[key]);
  });

  it('is stable across repeated calls with the same params', () => {
    for (const name of NAMES) {
      const a = renderGraphic(name, params({ seed: 3, density: 0.4 }));
      const b = renderGraphic(name, params({ seed: 3, density: 0.4 }));
      expect(a).toBe(b);
    }
  });

  it('actually varies with the seed', () => {
    // Guards the guard: if a generator ever stopped consuming the rng, every
    // golden above would still pass while the seed became meaningless.
    for (const name of NAMES) {
      const a = renderGraphic(name, params({ seed: 1 }));
      const b = renderGraphic(name, params({ seed: 2 }));
      expect(a, `${name} ignores its seed`).not.toBe(b);
    }
  });
});

/* ────────────────────────────────────────────────────────────────────────── */

/** Every number in an SVG string, in document order. */
const numbers = (svg: string): number[] =>
  (svg.match(/-?\d+\.?\d*/g) ?? []).map(Number);

/** 300 steps ≈ a 10s loop at 30fps — the resolution a real render would use. */
const STEPS = 300;

describe('generator coherence (the property animation needs)', () => {
  const cases = GENERATOR_LIST.map((g) => [g.name, g] as const);

  it.each(cases)('%s: sample() does not depend on t', (_name, gen) => {
    // Structural, not incidental: `sample` has no `t` parameter, so the only
    // way it could vary per frame is by reading a mutable module-level value.
    const p = params({ seed: 11, density: 0.6 });
    expect(gen.sample(p)).toEqual(gen.sample(p));
  });

  it.each(cases)('%s: t=0 is the static image', (_name, gen) => {
    // The invariant that makes the goldens above meaningful — every motion term
    // is written as `f(t) - f(0)`, so the still frame is untouched by animation.
    const p = params({ seed: 5, density: 0.5 });
    const s = gen.sample(p);
    expect(gen.project(s, p, 0)).toBe(
      renderGraphic(gen.name, params({ seed: 5, density: 0.5 })),
    );
  });

  it.each(cases)(
    '%s: t=1 renders identically to t=0, so the loop closes',
    (_name, gen) => {
      for (const seed of SEEDS) {
        const p = params({ seed, density: 0.6 });
        const s = gen.sample(p);
        expect(gen.project(s, p, 1)).toBe(gen.project(s, p, 0));
      }
    },
  );

  it.each(cases)('%s: actually moves between frames', (_name, gen) => {
    // Guards the guard. Every assertion in this block is satisfied by a
    // generator that ignores `t` entirely, so without this one "animated" could
    // silently mean "static".
    const p = params({ seed: 5, density: 0.6 });
    const s = gen.sample(p);
    expect(gen.project(s, p, 0.37)).not.toBe(gen.project(s, p, 0));
  });

  it.each(cases)(
    '%s: no mark appears or disappears across the loop',
    (_name, gen) => {
      // The confetti test. A generator that re-rolls between frames changes how
      // many marks it emits; one that moves keeps the count fixed and only shifts
      // the values. This is the assertion that would have failed before the split.
      const p = params({ seed: 7, density: 0.6 });
      const s = gen.sample(p);
      const baseline = numbers(gen.project(s, p, 0)).length;
      for (let i = 1; i <= STEPS; i++) {
        expect(numbers(gen.project(s, p, i / STEPS)).length).toBe(baseline);
      }
    },
  );

  it.each(cases)(
    '%s: moves smoothly relative to how far it travels',
    (_name, gen) => {
      // Measured as a ratio, not an absolute distance.
      //
      // This was `worst < 3` — a number read off the wobbling generators, which
      // all move a mark a little about a fixed point. `ridgeline` translates a
      // whole silhouette instead, so it legitimately moves 20 units a step and
      // failed a bound that was never a law, just the previous set's ceiling.
      //
      // The property actually worth testing is scale-free: smooth motion covers
      // its distance in many small steps, so peak displacement is far larger
      // than any single step. A generator re-rolling between frames reaches its
      // full range in *one* step, so the ratio collapses to about 1. Every
      // generator here scores 4.6 or better and most score 35+; the threshold
      // catches the failure without pinning anything to a canvas size.
      const MIN_SMOOTHNESS = 4;
      const p = params({ seed: 7, density: 0.6 });
      const s = gen.sample(p);
      const base = numbers(gen.project(s, p, 0));
      let prev = base;
      let peak = 0;
      let worst = 0;
      for (let i = 1; i <= STEPS; i++) {
        const next = numbers(gen.project(s, p, i / STEPS));
        for (let k = 0; k < base.length; k++) {
          peak = Math.max(peak, Math.abs(next[k] - base[k]));
          worst = Math.max(worst, Math.abs(next[k] - prev[k]));
        }
        prev = next;
      }
      expect(peak / worst).toBeGreaterThan(MIN_SMOOTHNESS);
    },
  );

  it.each(cases)('%s: moves far enough to be seen', (_name, gen) => {
    // The assertion that was missing, and the reason it was missing is the
    // point: every other test in this block is satisfied by a generator that
    // moves by a third of a pixel. The first pass shipped `dot-grid` peaking at
    // 2.35px with 1.2% of its marks moving, and `diagonal-hatch` at 2.20px with
    // 0.8% — both provably coherent, seamlessly looping, and visually still.
    //
    // Coherence says motion is well-formed. Only this says there is any.
    const MIN_PEAK_PX = 10;
    const p = params({ seed: 7, density: 0.6 });
    const s = gen.sample(p);
    const base = numbers(gen.project(s, p, 0));
    let peak = 0;
    for (let i = 1; i <= STEPS; i++) {
      const cur = numbers(gen.project(s, p, i / STEPS));
      for (let k = 0; k < base.length; k++) {
        peak = Math.max(peak, Math.abs(cur[k] - base[k]));
      }
    }
    expect(peak).toBeGreaterThan(MIN_PEAK_PX);
  });

  it.each(cases)('%s: emits no NaN at any point in the loop', (_name, gen) => {
    const p = params({ seed: 3, density: 0.7 });
    const s = gen.sample(p);
    for (let i = 0; i <= STEPS; i++) {
      expect(gen.project(s, p, i / STEPS)).not.toContain('NaN');
    }
  });
});

describe('ridgeline parallax', () => {
  interface Ridge {
    speed: number;
    harmonics: { freq: number }[];
  }

  const ridges = () => {
    const gen = GENERATOR_LIST.find((g) => g.name === 'ridgeline');
    if (!gen) throw new Error('ridgeline is not registered');
    return gen.sample(params({ seed: 7, density: 0.6 })) as Ridge[];
  };

  it('drifts faster the nearer the range', () => {
    // The parallax, asserted rather than eyeballed. Layers are sampled far to
    // near, so speed must rise monotonically — a range that overtook the one in
    // front of it would read as the depth order inverting.
    const speeds = ridges().map((r) => r.speed);
    expect(speeds.length).toBeGreaterThan(2);
    for (let i = 1; i < speeds.length; i++) {
      expect(speeds[i]).toBeGreaterThanOrEqual(speeds[i - 1]);
    }
    expect(speeds[speeds.length - 1]).toBeGreaterThan(speeds[0]);
  });

  it('never crosses the frame in a loop', () => {
    // What "too fast" meant concretely: this used to reach 3 frame-widths per
    // loop, which blurs rather than drifts.
    for (const r of ridges()) {
      expect(r.speed).toBeGreaterThan(0);
      expect(r.speed).toBeLessThan(0.5);
    }
  });

  it('gives every harmonic a whole number of cycles per loop', () => {
    // This is *why* the speeds can be fractional at all. Each frequency is a
    // multiple of the layer's base, so `freq * speed` is an integer and the
    // range lands exactly where it started — the loop-closure test proves the
    // result, this one names the mechanism.
    for (const r of ridges()) {
      for (const h of r.harmonics) {
        expect(h.freq * r.speed).toBeCloseTo(Math.round(h.freq * r.speed), 10);
      }
    }
  });

  it('samples finely enough not to alias its own peaks', () => {
    // `1 - |sin|` peaks twice per period, and the projection samples 192 times
    // across the frame. Below about four samples per peak the corners alias
    // into noise, which is the opposite of the crisp silhouette intended.
    const top = Math.max(
      ...ridges().flatMap((r) => r.harmonics.map((h) => h.freq)),
    );
    expect(192 / (2 * top)).toBeGreaterThan(3);
  });
});

describe('the integer-cycle rule', () => {
  it('is why the loop closes, and a fraction would break it', () => {
    // Executable form of the trap: motion is `sin(t·2π·k + φ)`, which returns to
    // its t=0 value at t=1 only for integer k. A float multiplier produces a
    // jump at the loop point that reads as an encoding glitch rather than as a
    // bug in this file, so it is worth pinning here rather than in a comment.
    const at = (k: number, t: number) => Math.sin(t * Math.PI * 2 * k + 0.9);
    for (const k of [1, 2, 3]) {
      expect(at(k, 1)).toBeCloseTo(at(k, 0), 10);
    }
    for (const k of [1.7, 2.4]) {
      expect(Math.abs(at(k, 1) - at(k, 0))).toBeGreaterThan(0.1);
    }
  });
});

describe('t through the public registry', () => {
  it('defaults to the static frame when omitted', () => {
    expect(renderGraphic('contour', params())).toBe(
      renderGraphic('contour', params({ t: 0 })),
    );
  });

  it('is honoured by renderGraphic, so callers need not sample themselves', () => {
    expect(renderGraphic('contour', params({ t: 0.4 }))).not.toBe(
      renderGraphic('contour', params({ t: 0 })),
    );
  });
});
