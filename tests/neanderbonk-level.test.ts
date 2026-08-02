import { describe, expect, it } from 'vitest';
import {
  classifyNearField,
  type NearFieldCalibration,
  rmsOf,
  rmsToDb,
} from '../components/experiments/neanderbonk/voice/levelMeter';

/** One cycle of a sine wave at amplitude `a`, sampled `n` times. */
function sine(a: number, n = 2048): Float32Array {
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    samples[i] = a * Math.sin((2 * Math.PI * i) / n);
  }
  return samples;
}

describe('rmsOf', () => {
  it('measures a sine wave of amplitude A as A/√2', () => {
    for (const a of [1, 0.5, 0.1]) {
      expect(rmsOf(sine(a))).toBeCloseTo(a / Math.SQRT2, 4);
    }
  });

  it('measures silence as zero', () => {
    expect(rmsOf(new Float32Array(2048))).toBe(0);
    expect(rmsOf(new Float32Array(0))).toBe(0);
  });
});

describe('rmsToDb', () => {
  it('maps full scale to 0 dBFS', () => {
    expect(rmsToDb(1)).toBe(0);
  });

  it('clamps silence to the -100 dBFS floor rather than -Infinity', () => {
    expect(rmsToDb(0)).toBe(-100);
    expect(rmsToDb(-1)).toBe(-100);
    expect(rmsToDb(1e-9)).toBe(-100);
  });

  it('is monotonic above the clamp: louder is never quieter', () => {
    const levels = [0.0001, 0.001, 0.01, 0.1, 0.5, 1].map(rmsToDb);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i]).toBeGreaterThan(levels[i - 1]);
    }
  });

  it('drops 6 dB per halving of amplitude', () => {
    expect(rmsToDb(0.5) - rmsToDb(0.25)).toBeCloseTo(20 * Math.log10(2), 6);
  });
});

describe('classifyNearField', () => {
  // A plausible enrolment: the poet at -20 dBFS, a room floor at -55 dBFS.
  const calibration: NearFieldCalibration = { nearDb: -20, floorDb: -55 };

  it('rules on levels the way the referee needs', () => {
    const cases: Array<[number, 'near' | 'far' | 'uncertain', string]> = [
      [-18, 'near', 'louder than enrolment'],
      [-20, 'near', 'exactly the enrolled level'],
      [-26, 'near', 'the 6 dB near boundary is inclusive'],
      [-26.1, 'uncertain', 'just outside the near band'],
      [-29, 'uncertain', 'the 6–12 dB gap stays uncertain'],
      [-31.9, 'uncertain', 'just above the far boundary'],
      [-32, 'far', 'the 12 dB far boundary is inclusive'],
      [-45, 'far', 'clearly across the table'],
      [-100, 'far', 'silence floor'],
    ];
    for (const [db, expected, why] of cases) {
      expect(classifyNearField(db, calibration), `${db} dB — ${why}`).toBe(
        expected,
      );
    }
  });

  it('lets the noise floor shrink the uncertain gap', () => {
    // A noisy room where floorDb + 3 sits inside the 6–12 dB gap: readings at
    // ambient level are 'far' even though they are less than 12 dB below the
    // enrolled near level. The near band still wins above nearDb - 6.
    const noisy: NearFieldCalibration = { nearDb: -30, floorDb: -42 };
    expect(classifyNearField(-36, noisy)).toBe('near'); // near band still wins
    expect(classifyNearField(-37.5, noisy)).toBe('uncertain');
    expect(classifyNearField(-39, noisy)).toBe('far'); // floorDb + 3, inclusive
    expect(classifyNearField(-40.5, noisy)).toBe('far'); // above the 12 dB line
    expect(classifyNearField(-42, noisy)).toBe('far');
  });

  it('never promotes the uncertain gap: false accusations are worse than misses', () => {
    for (let db = -26.5; db > -31.5; db -= 0.5) {
      expect(classifyNearField(db, calibration), `${db} dB`).toBe('uncertain');
    }
  });
});
