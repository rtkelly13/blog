/**
 * Unit tests for the shared basis, one describe per module.
 *
 * These primitives are depended on by every generator, so a bug in one of them
 * shows up as seventeen mysterious golden diffs rather than as a failure that
 * says what broke. Testing them directly is what turns that into one red test
 * with a name.
 */
import { describe, expect, it } from 'vitest';
import {
  disorderAt,
  scramble,
} from '../components/graphics/generators/shared/disorder';
import { lerp, r2, TAU } from '../components/graphics/generators/shared/math';
import {
  cycles,
  DRIFT_OF_FRAME,
  ORBIT_OF_CELL,
  wobble,
} from '../components/graphics/generators/shared/motion';
import {
  hash2,
  smooth,
  valueNoise,
} from '../components/graphics/generators/shared/noise';
import { frame } from '../components/graphics/generators/shared/svg';
import { wave } from '../components/graphics/generators/shared/tiling';
import { lattice } from '../components/graphics/lattice';
import type { GraphicParams } from '../components/graphics/types';

const P = (over: Partial<GraphicParams> = {}): GraphicParams => ({
  width: 1280,
  height: 720,
  seed: 1,
  t: 0,
  accent: '#22d3ee',
  background: 'transparent',
  density: 0.5,
  opacity: 1,
  strokeWidth: 2,
  occlusion: '#0a0a1a',
  disorder: 0,
  contrast: 1,
  originX: 0.5,
  originY: 0.5,
  ...over,
});

describe('shared/math', () => {
  it('lerp hits both ends exactly', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('r2 rounds to two places, which is what absorbs float drift at t=1', () => {
    expect(r2(1.006)).toBe(1.01);
    expect(r2(1 / 3)).toBe(0.33);
    // 1.005 rounds *down*, because 1.005 * 100 is 100.49999... in binary. Not a
    // bug, and pinned so nobody "fixes" it into something that changes goldens.
    expect(r2(1.005)).toBe(1);
    // The case that matters: a value that is zero up to float error must print
    // as a plain zero, or `t = 1` differs textually from `t = 0`.
    expect(`${r2(-4.9e-16)}`).toBe('0');
  });

  it('TAU is a full turn', () => {
    expect(TAU).toBeCloseTo(Math.PI * 2, 12);
  });
});

describe('shared/motion', () => {
  it('cycles is always a positive integer', () => {
    // The single rule the loop depends on. A float here produces a jump at the
    // loop point that reads as an encoding glitch rather than as a bug.
    for (let i = 0; i < 500; i++) {
      const k = cycles(i * 0.37, 3);
      expect(Number.isInteger(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(1);
      expect(k).toBeLessThanOrEqual(3);
    }
  });

  it('cycles honours its ceiling, and handles negatives', () => {
    expect(cycles(-12.3, 2)).toBeLessThanOrEqual(2);
    expect(cycles(-12.3, 2)).toBeGreaterThanOrEqual(1);
  });

  it('wobble is exactly zero at t=0 and t=1', () => {
    // Why `t = 0` is the still image and why the loop closes. Asserted across
    // phases and cycle counts because it must hold for every caller, not for
    // the convenient ones.
    for (const phase of [0, 0.7, 2.9, TAU]) {
      for (const k of [1, 2, 3]) {
        expect(wobble(0, k, phase)).toBe(0);
        expect(Math.abs(wobble(1, k, phase))).toBeLessThan(1e-12);
      }
    }
  });

  it('wobble actually leaves zero in between', () => {
    // Guards the guard: a function returning 0 always would pass the above.
    let peak = 0;
    for (let i = 1; i < 100; i++)
      peak = Math.max(peak, Math.abs(wobble(i / 100, 1, 0)));
    expect(peak).toBeGreaterThan(0.5);
  });

  it('keeps its travel constants in a sane range', () => {
    for (const v of [ORBIT_OF_CELL, DRIFT_OF_FRAME]) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shared/noise', () => {
  it('hash2 is deterministic and bounded', () => {
    expect(hash2(3, 7, 11)).toBe(hash2(3, 7, 11));
    for (let i = 0; i < 200; i++) {
      const v = hash2(i * 1.3, i * -2.1, 5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hash2 separates on every argument, seed included', () => {
    expect(hash2(1, 2, 3)).not.toBe(hash2(2, 1, 3));
    expect(hash2(1, 2, 3)).not.toBe(hash2(1, 2, 4));
  });

  it('smooth is a smoothstep — clamped ends, zero gradient at both', () => {
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    expect(smooth(0.5)).toBeCloseTo(0.5, 12);
    // Flat at the ends is what stops the noise grid showing as facets.
    expect(smooth(0.001)).toBeLessThan(0.001);
    expect(smooth(0.999)).toBeGreaterThan(0.999);
  });

  it('valueNoise is continuous — no jumps at lattice crossings', () => {
    // The failure this catches is interpolation that breaks at integers, which
    // renders as a visible grid in anything noise-driven.
    let worst = 0;
    let prev = valueNoise(0, 0.5, 3);
    for (let i = 1; i <= 4000; i++) {
      const x = (i / 4000) * 8; // crosses eight lattice lines
      const cur = valueNoise(x, 0.5, 3);
      worst = Math.max(worst, Math.abs(cur - prev));
      prev = cur;
    }
    expect(worst).toBeLessThan(0.02);
  });

  it('valueNoise stays in [0, 1]', () => {
    for (let i = 0; i < 400; i++) {
      const v = valueNoise(i * 0.31, i * 0.17, 2);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('sampled around a circle, it closes exactly', () => {
    // The property `ridgeline` is built on: the profile is aperiodic to look at
    // but returns to itself after one circuit.
    const at = (u: number) =>
      valueNoise(0.9 * Math.cos(u * TAU), 0.9 * Math.sin(u * TAU), 7);
    expect(at(1)).toBeCloseTo(at(0), 10);
  });
});

describe('shared/disorder', () => {
  it('scramble is deterministic and spans [-1, 1)', () => {
    expect(scramble(3, 4, 1)).toBe(scramble(3, 4, 1));
    let lo = 1;
    let hi = -1;
    for (let i = 0; i < 800; i++) {
      const v = scramble(i * 1.7, i * 0.9, 1);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThan(1);
    }
    expect(lo).toBeLessThan(-0.8);
    expect(hi).toBeGreaterThan(0.8);
  });

  it('the salt separates independent uses at the same point', () => {
    // Generators call this twice per mark, for x and for y. Sharing a value
    // would move every mark along a 45-degree diagonal.
    expect(scramble(5, 5, 1)).not.toBe(scramble(5, 5, 2));
  });

  it('disorderAt is exactly zero when disorder is zero', () => {
    // The claim that lets the ramp be added to generators pinned by goldens.
    for (const y of [0, 100, 360, 719]) {
      expect(disorderAt(P({ disorder: 0 }), y)).toBe(0);
    }
  });

  it('disorderAt ramps from the top edge to the bottom', () => {
    const p = P({ disorder: 1 });
    expect(disorderAt(p, 0)).toBe(0);
    expect(disorderAt(p, 720)).toBeCloseTo(1, 10);
    expect(disorderAt(p, 200)).toBeLessThan(disorderAt(p, 500));
  });

  it('disorderAt holds the ordered end longer than linear', () => {
    // Squared, so the lattice stays convincing for the first third rather than
    // degrading from the first row. That contrast is the whole effect.
    const p = P({ disorder: 1 });
    expect(disorderAt(p, 360)).toBeLessThan(0.5);
  });

  it('disorderAt clamps outside the frame', () => {
    const p = P({ disorder: 1 });
    expect(disorderAt(p, -50)).toBe(0);
    expect(disorderAt(p, 5000)).toBeCloseTo(1, 10);
  });
});

describe('shared/svg', () => {
  it('emits a well-formed root with the params it was given', () => {
    const svg = frame(P({ width: 100, height: 50, opacity: 0.5 }), '<rect/>');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('viewBox="0 0 100 50"');
    expect(svg).toContain('opacity="0.5"');
    expect(svg).toContain('<rect/>');
  });

  it('omits the backdrop when the background is transparent', () => {
    // The default, and it matters: a graphic layering over a surface must not
    // paint one of its own.
    expect(frame(P({ background: 'transparent' }), '')).not.toContain('<rect ');
    expect(frame(P({ background: '#ff0000' }), '')).toContain('#ff0000');
  });

  it('marks itself as an image for assistive tech', () => {
    expect(frame(P(), '')).toContain('role="img"');
  });
});

describe('shared/tiling', () => {
  it('wave closes the loop for every cell position', () => {
    for (const pos of [0, 0.3, 0.85]) {
      for (const k of [1, 2]) {
        for (const m of [1, 2, 3]) {
          expect(wave(0, pos, k, m)).toBeCloseTo(wave(1, pos, k, m), 10);
        }
      }
    }
  });

  it('wave varies across the frame, so the field travels', () => {
    // A field that is the same everywhere reads as the whole surface pulsing,
    // which is the thing tilings are meant to improve on.
    expect(wave(0.25, 0, 1, 1)).not.toBeCloseTo(wave(0.25, 0.5, 1, 1), 6);
  });

  it('re-exports a lattice that covers past every edge', () => {
    // Bleed is what stops a moving tiling showing a bare margin.
    const cells = lattice('hex', { width: 200, height: 100, size: 20 });
    expect(cells.some((c) => c.cx < 0)).toBe(true);
    expect(cells.some((c) => c.cx > 200)).toBe(true);
    expect(cells.some((c) => c.cy < 0)).toBe(true);
    expect(cells.some((c) => c.cy > 100)).toBe(true);
  });
});
