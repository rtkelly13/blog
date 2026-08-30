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
import {
  GENERATOR_LIST,
  getGenerator,
  renderGraphic,
} from '../components/graphics/registry';
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
    occlusion: '#0a0a1a',
    disorder: 0,
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

describe('ridgeline terrain', () => {
  interface Ridge {
    period: number;
    base: number;
    seed: number;
  }

  const ridges = () => {
    const gen = GENERATOR_LIST.find((g) => g.name === 'ridgeline');
    if (!gen) throw new Error('ridgeline is not registered');
    return gen.sample(params({ seed: 7, density: 0.6 })) as Ridge[];
  };

  /** The y of every sampled point on one range, in draw order. */
  const profile = (index: number): number[] => {
    const svg = renderGraphic('ridgeline', params({ seed: 7, density: 0.6 }));
    const paths = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
    return [...paths[index].matchAll(/L[\d.-]+ ([\d.-]+)/g)].map((m) =>
      Number(m[1]),
    );
  };

  it('drifts faster the nearer the range', () => {
    // The parallax, asserted rather than eyeballed. Layers are sampled far to
    // near, so `period` — which is both the drift and the feature scale — must
    // rise monotonically.
    const periods = ridges().map((r) => r.period);
    expect(periods.length).toBeGreaterThan(2);
    for (let i = 1; i < periods.length; i++) {
      expect(periods[i]).toBeGreaterThanOrEqual(periods[i - 1]);
    }
    expect(periods[periods.length - 1]).toBeGreaterThan(periods[0]);
  });

  it('never puts a whole circuit inside the frame, so nothing repeats', () => {
    // The property the noise-on-a-circle construction exists for. One trip
    // round the circle spans `period` frame-widths; below 1 the frame would
    // contain more than one circuit and the terrain would visibly repeat.
    //
    // This is also why the drift cannot be slower: the period and the speed are
    // the same number. Three earlier versions bought slow drift with a short
    // period and every one of them read as a comb.
    for (const r of ridges()) {
      expect(r.period).toBeGreaterThanOrEqual(1);
      expect(r.period).toBeLessThanOrEqual(1.5);
    }
  });

  it('gives every layer its own terrain', () => {
    // Layers walk separate patches of noise space. Shared seeds would make the
    // ranges echo each other, which reads as one range drawn several times.
    const seeds = ridges().map((r) => r.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('is not periodic across the frame', () => {
    // The failure three previous versions had, measured directly rather than
    // argued from the frequencies. A periodic profile correlates strongly with
    // itself shifted by its period; terrain does not correlate with itself at
    // any non-zero shift.
    const near = profile(ridges().length - 1);
    const corr = (v: number[], lag: number) => {
      const n = v.length - lag;
      const mean = v.reduce((a, b) => a + b, 0) / v.length;
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) num += (v[i] - mean) * (v[i + lag] - mean);
      for (const q of v) den += (q - mean) ** 2;
      return num / den;
    };
    expect(near.length).toBeGreaterThan(100);
    // Every shift from an eighth to half the frame must stay well below a
    // self-match. The old harmonic version peaked near 1.0 at its period.
    let worst = 0;
    for (let lag = Math.floor(near.length / 8); lag < near.length / 2; lag++) {
      worst = Math.max(worst, corr(near, lag));
    }
    expect(worst).toBeLessThan(0.6);
  });

  it('samples finely enough not to alias its own creases', () => {
    // Ridged noise puts a crease at every fold, and the finest octave sets how
    // many. Counted from the rendered profile rather than from the constants,
    // so adding an octave without adding samples fails here.
    const near = profile(ridges().length - 1);
    let extrema = 0;
    for (let i = 1; i < near.length - 1; i++) {
      const a = near[i] - near[i - 1];
      const b = near[i + 1] - near[i];
      if (a !== 0 && b !== 0 && Math.sign(a) !== Math.sign(b)) extrema++;
    }
    // At least four samples per feature, counting both slopes of each.
    expect(near.length / Math.max(1, extrema)).toBeGreaterThan(4);
  });
});

describe('disorder: the ramp, and why it is free', () => {
  // The generators that honour it. The rest ignore it, which is allowed —
  // `disorder` perturbs a lattice, and not every generator has one.
  const RAMPED = ['dot-grid', 'iso-grid', 'truchet-arcs'];

  it.each(RAMPED)('%s: disorder=0 is byte-identical to the golden', (name) => {
    // The claim that lets this be added to shipped generators at all. It holds
    // because the perturbation is hashed from coordinates rather than drawn
    // from the rng — a draw would shift the stream and re-roll every later
    // mark even when multiplied by zero.
    expect(renderGraphic(name, params({ disorder: 0 }))).toBe(
      renderGraphic(name, params()),
    );
  });

  it.each(RAMPED)('%s: disorder actually perturbs the lattice', (name) => {
    expect(renderGraphic(name, params({ disorder: 0.9 }))).not.toBe(
      renderGraphic(name, params({ disorder: 0 })),
    );
  });

  it.each(RAMPED)(
    '%s: perturbs the far edge more than the near one',
    (name) => {
      // The property that makes it a ramp rather than jitter. If the gradient
      // were flat, or inverted, both bands would move by the same amount.
      const calm = numbers(renderGraphic(name, params({ disorder: 0 })));
      const wild = numbers(renderGraphic(name, params({ disorder: 1 })));
      expect(wild.length).toBe(calm.length);
      let nearSum = 0;
      let farSum = 0;
      for (let i = 1; i < calm.length; i += 2) {
        const drift =
          Math.abs(wild[i] - calm[i]) + Math.abs(wild[i - 1] - calm[i - 1]);
        if (calm[i] < 720 / 3) nearSum += drift;
        else if (calm[i] > (720 * 2) / 3) farSum += drift;
      }
      expect(farSum).toBeGreaterThan(nearSum * 2);
    },
  );

  it('does not vary with t — it is sampled, not projected', () => {
    // Same trap as `density`: animating it would move a loop bound in `sample`
    // and re-roll the composition. Asserting it is inert in `project` is what
    // stops someone wiring it to a scrubber.
    const gen = getGenerator('dot-grid');
    if (!gen) throw new Error('dot-grid missing');
    const p = params({ disorder: 0.7 });
    expect(gen.sample(p)).toEqual(gen.sample({ ...p, t: 0.42 }));
  });
});

describe('occlusion: opaque, and its own colour', () => {
  it('iso-cubes paints faces with it', () => {
    expect(
      renderGraphic('iso-cubes', params({ occlusion: '#123456' })),
    ).toContain('#123456');
  });

  it('is not derivable from accent or background', () => {
    // The whole argument for a third parameter. Moving `occlusion` alone must
    // change the output, or it is a synonym for something already there.
    const base = params({ accent: '#22d3ee', background: '#000000' });
    expect(
      renderGraphic('iso-cubes', { ...base, occlusion: '#111111' }),
    ).not.toBe(renderGraphic('iso-cubes', { ...base, occlusion: '#222222' }));
  });

  it('is opaque, so a nearer cube hides a farther one', () => {
    // An rgba() face would let the stack show through, which is the failure the
    // parameter exists to prevent.
    const svg = renderGraphic('iso-cubes', params({ occlusion: '#0a0a1a' }));
    expect(svg).toContain('fill="#0a0a1a"');
    expect(svg).not.toContain('rgba(10, 10, 26');
  });

  it('is used by ridgeline, whose ranges have to hide each other', () => {
    // The layered ranges were filled with alpha 0.04-0.11 and occluded nothing,
    // so the stack read as overlapping line charts rather than as distance.
    const base = params({ accent: '#22d3ee' });
    expect(
      renderGraphic('ridgeline', { ...base, occlusion: '#111111' }),
    ).not.toBe(renderGraphic('ridgeline', { ...base, occlusion: '#222222' }));
  });

  it('leaves generators that do not stack geometry untouched', () => {
    for (const name of ['dot-grid', 'contour', 'diagonal-hatch']) {
      expect(renderGraphic(name, params({ occlusion: '#ff0000' }))).toBe(
        renderGraphic(name, params({ occlusion: '#00ff00' })),
      );
    }
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
