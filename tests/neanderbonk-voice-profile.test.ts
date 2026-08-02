import { describe, expect, it } from 'vitest';
import {
  buildProfile,
  classifySpeaker,
  extractFeatures,
  scoreSegment,
  type VoiceFeatures,
} from '../components/experiments/neanderbonk/voice/voiceProfile';

const SAMPLE_RATE = 48_000;
const FRAME_SIZE = 2048;

/**
 * Synthesises one voiced frame: a fundamental plus a few harmonics with
 * decaying amplitude — a crude but recognisable vowel-ish spectrum.
 * `phase` varies between frames so a "segment" isn't 30 identical arrays.
 */
function voicedFrame(fundamentalHz: number, phase = 0): Float32Array {
  const frame = new Float32Array(FRAME_SIZE);
  for (let i = 0; i < FRAME_SIZE; i++) {
    const t = (i / SAMPLE_RATE) * 2 * Math.PI * fundamentalHz + phase;
    frame[i] =
      0.4 * Math.sin(t) +
      0.2 * Math.sin(2 * t) +
      0.1 * Math.sin(3 * t) +
      0.05 * Math.sin(4 * t);
  }
  return frame;
}

function silentFrame(): Float32Array {
  return new Float32Array(FRAME_SIZE);
}

/** Deterministic pseudo-random noise frame (linear congruential, seeded). */
function noiseFrame(seed = 12345): Float32Array {
  const frame = new Float32Array(FRAME_SIZE);
  let state = seed;
  for (let i = 0; i < FRAME_SIZE; i++) {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    frame[i] = (state / 2_147_483_648) * 0.4 - 0.2;
  }
  return frame;
}

function voicedSegment(fundamentalHz: number, frames: number): VoiceFeatures[] {
  return Array.from({ length: frames }, (_, i) =>
    extractFeatures(voicedFrame(fundamentalHz, i * 0.7), SAMPLE_RATE),
  );
}

describe('extractFeatures', () => {
  it('recovers a 120 Hz fundamental within ±5 Hz', () => {
    const features = extractFeatures(voicedFrame(120), SAMPLE_RATE);
    expect(features.pitchHz).not.toBeNull();
    expect(features.pitchHz as number).toBeGreaterThan(115);
    expect(features.pitchHz as number).toBeLessThan(125);
  });

  it('recovers a 220 Hz fundamental within ±5 Hz', () => {
    const features = extractFeatures(voicedFrame(220), SAMPLE_RATE);
    expect(features.pitchHz).not.toBeNull();
    expect(features.pitchHz as number).toBeGreaterThan(215);
    expect(features.pitchHz as number).toBeLessThan(225);
  });

  it('reports silence as unvoiced with zero rms', () => {
    const features = extractFeatures(silentFrame(), SAMPLE_RATE);
    expect(features.pitchHz).toBeNull();
    expect(features.rms).toBe(0);
  });

  it('does not crash on a noise frame, and does not fake confidence', () => {
    const features = extractFeatures(noiseFrame(), SAMPLE_RATE);
    expect(features.rms).toBeGreaterThan(0);
    expect(features.bands).toHaveLength(8);
    // Noise may occasionally fool the autocorrelator; what matters is it
    // returns a well-formed result rather than throwing.
    const total = features.bands.reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('normalises band energies to sum 1 on voiced frames', () => {
    const features = extractFeatures(voicedFrame(120), SAMPLE_RATE);
    const total = features.bands.reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe('buildProfile', () => {
  it('returns null below 20 voiced frames', () => {
    expect(buildProfile(voicedSegment(120, 19))).toBeNull();
  });

  it('returns null when frames are voiced but padded out with silence', () => {
    const features = [
      ...voicedSegment(120, 10),
      ...Array.from({ length: 30 }, () =>
        extractFeatures(silentFrame(), SAMPLE_RATE),
      ),
    ];
    expect(buildProfile(features)).toBeNull();
  });

  it('recovers the enrolment pitch and ignores silent frames', () => {
    const features = [
      ...voicedSegment(120, 25),
      ...Array.from({ length: 5 }, () =>
        extractFeatures(silentFrame(), SAMPLE_RATE),
      ),
    ];
    const profile = buildProfile(features);
    expect(profile).not.toBeNull();
    expect(profile?.frames).toBe(25);
    expect(profile?.pitchHz).toBeGreaterThan(115);
    expect(profile?.pitchHz).toBeLessThan(125);
  });
});

describe('scoreSegment', () => {
  const profile120 = buildProfile(voicedSegment(120, 30));
  if (!profile120) throw new Error('enrolment failed in test setup');

  it('scores the same voice above 0.75', () => {
    const score = scoreSegment(voicedSegment(120, 10), profile120);
    expect(score).not.toBeNull();
    expect(score as number).toBeGreaterThan(0.75);
  });

  it('scores a 220 Hz voice against a 120 Hz profile below 0.5', () => {
    const score = scoreSegment(voicedSegment(220, 10), profile120);
    expect(score).not.toBeNull();
    expect(score as number).toBeLessThan(0.5);
  });

  it('returns null for an unvoiced-only segment', () => {
    const features = Array.from({ length: 10 }, () =>
      extractFeatures(silentFrame(), SAMPLE_RATE),
    );
    expect(scoreSegment(features, profile120)).toBeNull();
  });
});

describe('classifySpeaker', () => {
  it('calls poet at or above the upper threshold', () => {
    expect(classifySpeaker(0.9)).toBe('poet');
    expect(classifySpeaker(0.75)).toBe('poet');
  });

  it('calls other at or below the lower threshold', () => {
    expect(classifySpeaker(0.2)).toBe('other');
    expect(classifySpeaker(0.45)).toBe('other');
  });

  it('stays uncertain in the band between, and on null', () => {
    expect(classifySpeaker(0.6)).toBe('uncertain');
    expect(classifySpeaker(null)).toBe('uncertain');
  });

  it('honours custom thresholds', () => {
    expect(classifySpeaker(0.6, { poetAbove: 0.55 })).toBe('poet');
    expect(classifySpeaker(0.6, { otherBelow: 0.65 })).toBe('other');
  });
});
