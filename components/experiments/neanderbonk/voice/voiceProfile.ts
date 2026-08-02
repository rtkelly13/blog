/**
 * Approach B — voice-profile similarity for NeanderBonk speaker isolation.
 *
 * Enrol the poet from a few seconds of their speech, then score later
 * segments for similarity to that profile. Deliberately a classical-DSP
 * baseline — autocorrelation pitch plus spectral shape — with no model
 * download, built to be measured against the loudness-gate baseline on the
 * lab page.
 *
 * Be honest about what this can and cannot do. Pitch plus coarse timbre
 * will separate a deep voice from a high one across a table. It will NOT
 * separate two similar adult voices, and overlapping speech breaks it
 * entirely (the features become a blend that matches nobody). Treat it as a
 * measuring stick for whether anything short of a real speaker-embedding
 * model is worth having, not as a speaker-recognition system.
 *
 * The error costs are asymmetric, exactly as in `rules.ts`: this feeds a
 * referee where a false accusation is the worst outcome. So uncertainty is a
 * first-class answer — unvoiced segments score `null`, and `classifySpeaker`
 * has an explicit `uncertain` band between its thresholds.
 *
 * Pure module — no React, no DOM, no Web Audio. The UI layer feeds it
 * 2048-sample `Float32Array` PCM frames at a known sample rate; everything
 * here is unit-testable in plain Node with synthesised signals
 * (`tests/neanderbonk-voice-profile.test.ts`).
 */

export type VoiceFeatures = {
  /** Fundamental frequency estimate in Hz, or null for unvoiced/silent frames. */
  readonly pitchHz: number | null;
  /** Spectral centroid in Hz. */
  readonly centroidHz: number;
  /** Energy in ~8 log-spaced bands 100–4000 Hz, normalised to sum 1. */
  readonly bands: readonly number[];
  /** Frame RMS, for silence gating upstream. */
  readonly rms: number;
};

export type VoiceProfile = {
  /** Median voiced pitch during enrolment. */
  readonly pitchHz: number;
  /** Robust spread (MAD) of voiced pitch. */
  readonly pitchSpread: number;
  /** Median spectral centroid. */
  readonly centroidHz: number;
  /** Mean normalised band energies. */
  readonly bands: readonly number[];
  /** Voiced frames used. */
  readonly frames: number;
};

export type SpeakerCall = 'poet' | 'other' | 'uncertain';

/** Human pitch search range for the autocorrelation, in Hz. */
const PITCH_MIN_HZ = 60;
const PITCH_MAX_HZ = 400;

/**
 * A frame quieter than this is silence; don't even look for pitch. Set low
 * (−54 dBFS) deliberately: the capture pipeline disables auto gain control so
 * the loudness gate sees raw levels, and real microphones at default gain sit
 * far below full scale — a floor of 0.01 silenced entire enrolment sessions.
 * The autocorrelation voicing threshold does the real gatekeeping.
 */
const RMS_FLOOR = 0.002;

/** Normalised autocorrelation peak below this is unvoiced (noise, fricatives). */
const VOICING_THRESHOLD = 0.5;

/** Band edges: 8 log-spaced bands covering 100–4000 Hz. */
const BAND_COUNT = 8;
const BAND_LOW_HZ = 100;
const BAND_HIGH_HZ = 4000;

/** Enrolment needs at least this many voiced frames to mean anything. */
const MIN_PROFILE_FRAMES = 20;

/**
 * In-place iterative radix-2 FFT. `re`/`im` lengths must be a power of two.
 * Small and dependency-free; 2048 points is nothing.
 */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tRe = re[b] * curRe - im[b] * curIm;
        const tIm = re[b] * curIm + im[b] * curRe;
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/**
 * Autocorrelation pitch over the 60–400 Hz lag range. Parabolic
 * interpolation on the peak sharpens the estimate to well under a bin —
 * cheap, and it is the difference between ±10 Hz and ±1 Hz at 48 kHz.
 * Returns null when the normalised peak is too weak to call voiced.
 */
function detectPitch(frame: Float32Array, sampleRate: number): number | null {
  const n = frame.length;
  const minLag = Math.floor(sampleRate / PITCH_MAX_HZ);
  const maxLag = Math.min(Math.ceil(sampleRate / PITCH_MIN_HZ), n - 1);
  if (minLag >= maxLag) return null;

  // Energy at lag zero normalises the peaks; a DC-ish or empty frame has none.
  let energy = 0;
  for (let i = 0; i < n; i++) energy += frame[i] * frame[i];
  if (energy === 0) return null;

  let bestLag = -1;
  let bestValue = 0;
  const correlations = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += frame[i] * frame[i + lag];
    // Normalise by the shrinking overlap so long lags aren't penalised.
    correlations[lag] = sum / energy / (1 - lag / n);
    if (correlations[lag] > bestValue) {
      bestValue = correlations[lag];
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestValue < VOICING_THRESHOLD) return null;

  // Octave-error guard: for a periodic signal every multiple of the true
  // period correlates almost as well, so take the *shortest* lag that is a
  // genuine local peak within tolerance of the best, not the global argmax.
  for (let lag = minLag + 1; lag < bestLag; lag++) {
    if (
      correlations[lag] >= bestValue * 0.9 &&
      correlations[lag] >= correlations[lag - 1] &&
      correlations[lag] >= correlations[lag + 1]
    ) {
      bestLag = lag;
      break;
    }
  }

  // Parabolic interpolation around the winning lag, clamped to half a bin —
  // with near-flat neighbours the parabola's vertex can shoot off wildly.
  let lag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const left = correlations[bestLag - 1];
    const centre = correlations[bestLag];
    const right = correlations[bestLag + 1];
    const denominator = left - 2 * centre + right;
    if (denominator !== 0) {
      const offset = (0.5 * (left - right)) / denominator;
      lag += Math.max(-0.5, Math.min(0.5, offset));
    }
  }

  return sampleRate / lag;
}

/**
 * Extracts pitch, spectral centroid, and coarse band energies from one PCM
 * frame. Works on any power-of-two frame length; the app feeds 2048 samples.
 */
export function extractFeatures(
  frame: Float32Array,
  sampleRate: number,
): VoiceFeatures {
  const n = frame.length;

  let sumSquares = 0;
  for (let i = 0; i < n; i++) sumSquares += frame[i] * frame[i];
  const rms = Math.sqrt(sumSquares / n);

  // Hann window before the FFT keeps leakage from smearing the band shape.
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    re[i] = frame[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  fft(re, im);

  const binHz = sampleRate / n;
  const half = n / 2;

  // Log-spaced band edges, 100–4000 Hz.
  const edges: number[] = [];
  const ratio = Math.log(BAND_HIGH_HZ / BAND_LOW_HZ);
  for (let b = 0; b <= BAND_COUNT; b++) {
    edges.push(BAND_LOW_HZ * Math.exp((ratio * b) / BAND_COUNT));
  }

  const bands = new Array<number>(BAND_COUNT).fill(0);
  let centroidNumerator = 0;
  let centroidDenominator = 0;
  for (let bin = 1; bin < half; bin++) {
    const hz = bin * binHz;
    const power = re[bin] * re[bin] + im[bin] * im[bin];
    centroidNumerator += hz * power;
    centroidDenominator += power;
    if (hz >= BAND_LOW_HZ && hz < BAND_HIGH_HZ) {
      const band = Math.min(
        BAND_COUNT - 1,
        Math.floor((BAND_COUNT * Math.log(hz / BAND_LOW_HZ)) / ratio),
      );
      bands[band] += power;
    }
  }

  const bandTotal = bands.reduce((total, value) => total + value, 0);
  const normalisedBands =
    bandTotal > 0
      ? bands.map((value) => value / bandTotal)
      : bands.map(() => 1 / BAND_COUNT);

  const centroidHz =
    centroidDenominator > 0 ? centroidNumerator / centroidDenominator : 0;

  const pitchHz = rms < RMS_FLOOR ? null : detectPitch(frame, sampleRate);

  return { pitchHz, centroidHz, bands: normalisedBands, rms };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Builds an enrolment profile from extracted features. Only voiced frames
 * count — silence and fricatives carry no speaker identity here and would
 * poison the medians. Returns null below 20 voiced frames: better to refuse
 * enrolment than to enrol on a cough.
 */
export function buildProfile(
  features: readonly VoiceFeatures[],
): VoiceProfile | null {
  const voiced = features.filter(
    (f): f is VoiceFeatures & { pitchHz: number } => f.pitchHz !== null,
  );
  if (voiced.length < MIN_PROFILE_FRAMES) return null;

  const pitches = voiced.map((f) => f.pitchHz);
  const pitchHz = median(pitches);
  const pitchSpread = median(pitches.map((p) => Math.abs(p - pitchHz)));

  const bandCount = voiced[0].bands.length;
  const bands = new Array<number>(bandCount).fill(0);
  for (const f of voiced) {
    for (let b = 0; b < bandCount; b++) bands[b] += f.bands[b];
  }
  const meanBands = bands.map((value) => value / voiced.length);

  return {
    pitchHz,
    pitchSpread,
    centroidHz: median(voiced.map((f) => f.centroidHz)),
    bands: meanBands,
    frames: voiced.length,
  };
}

function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

/**
 * 0..1 similarity of a segment (multiple frames) to a profile, or null when
 * the segment has no voiced frames at all — no evidence either way, and this
 * feeds a referee where a false accusation is the worst outcome, so absence
 * of evidence must never become a verdict.
 *
 * Three cues, weighted:
 * - pitch proximity, scaled by the profile's own spread (a monotone speaker
 *   earns a tighter gate than an expressive one) — the strongest cue;
 * - cosine similarity of mean band energies (coarse timbre), sharpened
 *   because normalised band vectors of any two voices are already fairly
 *   parallel;
 * - centroid proximity on a log scale — the weakest, mostly a tie-breaker.
 */
export function scoreSegment(
  features: readonly VoiceFeatures[],
  profile: VoiceProfile,
): number | null {
  const voiced = features.filter(
    (f): f is VoiceFeatures & { pitchHz: number } => f.pitchHz !== null,
  );
  if (voiced.length === 0) return null;

  const segmentPitch = median(voiced.map((f) => f.pitchHz));
  const segmentCentroid = median(voiced.map((f) => f.centroidHz));

  const bandCount = profile.bands.length;
  const bandSums = new Array<number>(bandCount).fill(0);
  for (const f of voiced) {
    for (let b = 0; b < Math.min(bandCount, f.bands.length); b++) {
      bandSums[b] += f.bands[b];
    }
  }
  const segmentBands = bandSums.map((value) => value / voiced.length);

  // Pitch: Gaussian falloff whose width is the profile's own spread, floored
  // so a perfectly steady enrolment tone doesn't demand the impossible. Ten
  // hertz of slack covers natural drift within one speaker; an octave apart
  // scores essentially zero.
  const pitchSigma = Math.max(profile.pitchSpread * 3, 10);
  const pitchDelta = segmentPitch - profile.pitchHz;
  const pitchScore = Math.exp(-0.5 * (pitchDelta / pitchSigma) ** 2);

  // Centroid: compared as a log-frequency ratio, since a 200 Hz shift means a
  // lot at 800 Hz and nothing at 3 kHz.
  const centroidRatio = Math.abs(
    Math.log2(Math.max(segmentCentroid, 1) / Math.max(profile.centroidHz, 1)),
  );
  const centroidScore = Math.exp(-2 * centroidRatio ** 2);

  // Bands: raw cosine of normalised energy vectors sits near 1 for almost any
  // pair of voices, so stretch the interesting top of the range.
  const cosine = Math.max(0, cosineSimilarity(segmentBands, profile.bands));
  const bandScore = Math.max(0, 1 - (1 - cosine) * 4);

  return 0.5 * pitchScore + 0.3 * bandScore + 0.2 * centroidScore;
}

/**
 * Turns a similarity into a call, with an explicit uncertain band. The
 * defaults are deliberately conservative: ≥ 0.75 to call the poet, ≤ 0.45 to
 * call someone else, and everything between — including no evidence at all —
 * stays uncertain, because the referee must never accuse on a shrug.
 */
export function classifySpeaker(
  similarity: number | null,
  opts?: { poetAbove?: number; otherBelow?: number },
): SpeakerCall {
  if (similarity === null) return 'uncertain';
  const poetAbove = opts?.poetAbove ?? 0.75;
  const otherBelow = opts?.otherBelow ?? 0.45;
  if (similarity >= poetAbove) return 'poet';
  if (similarity <= otherBelow) return 'other';
  return 'uncertain';
}
