/**
 * Approach A — the loudness gate — for speaker isolation in NeanderBonk.
 *
 * The Web Speech API transcribes the whole room and cannot say who spoke, so
 * open mic judges bystanders as the poet — the false-accusation failure mode.
 * But the physics of the game hand us an asymmetry: the poet *holds the
 * phone*, and near-field speech arrives 15–20 dB louder than anything across
 * the table. This module measures the microphone level continuously so that
 * words the (separate) recogniser settles can be tagged near-field or
 * far-field by when they were heard.
 *
 * Two design decisions worth defending:
 *
 * - **The processing constraints are disabled on purpose.** Auto gain control
 *   exists precisely to erase level differences between loud and quiet
 *   speakers — the exact signal this approach depends on. Echo cancellation
 *   and noise suppression likewise reshape the far-field energy we want to
 *   see raw. So `getUserMedia` asks for all three off.
 * - **Polling an `AnalyserNode`, not an `AudioWorklet`.** A ~50 ms
 *   `setInterval` reading time-domain samples is deliberately boring: no
 *   worklet module to load, no cross-thread messaging, and 20 Hz is ample
 *   resolution for tagging words that each last hundreds of milliseconds. The
 *   worklet is where a real streaming-model version would go, not this one.
 *
 * Classification keeps the referee's cardinal rule: a missed violation is
 * free, a false accusation ruins the game, so everything ambiguous stays
 * 'uncertain'.
 *
 * The pure helpers (`rmsOf`, `rmsToDb`, `classifyNearField`) have no DOM
 * dependencies and are unit-tested in `tests/neanderbonk-level.test.ts`; the
 * browser plumbing in `createLevelMeter` is not, by design.
 */

export type LevelSample = { readonly t: number; readonly db: number };

export type LevelMeterState =
  | 'idle'
  | 'running'
  | 'denied'
  | 'unsupported'
  | 'error';

export type LevelMeter = {
  /** Request the microphone and start sampling. Resolves once running. */
  readonly start: () => Promise<void>;
  readonly stop: () => void;
  readonly getState: () => LevelMeterState;
  /** Mean dBFS over the trailing `ms` window, or null before any samples. */
  readonly windowDb: (ms: number) => number | null;
  /** Most recent sample, or null. */
  readonly current: () => LevelSample | null;
  readonly dispose: () => void;
};

/** Root-mean-square amplitude of a buffer of [-1, 1] samples. */
export function rmsOf(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

/** dBFS floor: silence would otherwise be -Infinity, which sums badly. */
export const DB_FLOOR = -100;

/** Converts an RMS amplitude to dBFS, clamped at {@link DB_FLOOR}. */
export function rmsToDb(rms: number): number {
  if (rms <= 0) return DB_FLOOR;
  return Math.max(DB_FLOOR, 20 * Math.log10(rms));
}

export type NearFieldCalibration = {
  readonly nearDb: number;
  readonly floorDb: number;
};

/**
 * Decide near/far/uncertain given a level and a calibration captured during
 * enrolment (the poet says a phrase into the phone; the room is measured
 * quiet).
 *
 * The 6/12 dB hysteresis band exists to avoid flapping: 'near' only within
 * 6 dB of the calibrated near level, 'far' only 12 dB or more below it (or
 * down at the room's noise floor), and the 6 dB gap between them stays
 * 'uncertain'. That gap is not sloppiness — it feeds a referee whose cardinal
 * rule is that false accusations are worse than misses, so anything the level
 * cannot settle must be reported as unsettled.
 */
export function classifyNearField(
  db: number,
  calibration: NearFieldCalibration,
): 'near' | 'far' | 'uncertain' {
  if (db >= calibration.nearDb - 6) return 'near';
  if (db <= calibration.nearDb - 12 || db <= calibration.floorDb + 3) {
    return 'far';
  }
  return 'uncertain';
}

/** How often the analyser is read. 20 Hz is plenty for word-length events. */
const POLL_INTERVAL_MS = 50;

/** How much history the ring buffer keeps. */
const HISTORY_MS = 10_000;

const RING_CAPACITY = Math.ceil(HISTORY_MS / POLL_INTERVAL_MS);

export function createLevelMeter(): LevelMeter {
  let state: LevelMeterState = 'idle';
  let disposed = false;

  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  // Fixed-size ring buffer of samples: cheap, allocation-free per tick, and
  // naturally bounded at ~10 s of history.
  const ring: LevelSample[] = [];
  let ringHead = 0;

  const push = (sample: LevelSample): void => {
    if (ring.length < RING_CAPACITY) {
      ring.push(sample);
    } else {
      ring[ringHead] = sample;
      ringHead = (ringHead + 1) % RING_CAPACITY;
    }
  };

  const latest = (): LevelSample | null => {
    if (ring.length === 0) return null;
    const index =
      ring.length < RING_CAPACITY
        ? ring.length - 1
        : (ringHead + RING_CAPACITY - 1) % RING_CAPACITY;
    return ring[index];
  };

  const teardown = (): void => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = null;
    }
    if (audioContext) {
      void audioContext.close().catch(() => {
        // Already closed — nothing left to release.
      });
      audioContext = null;
    }
  };

  const start = async (): Promise<void> => {
    if (disposed || state === 'running') return;

    // SSR, or a browser without capture support.
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      state = 'unsupported';
      return;
    }

    try {
      // All three processing stages off: auto gain control would erase
      // exactly the near/far level difference this whole approach depends on,
      // and echo cancellation / noise suppression reshape the far-field
      // energy we need to see raw.
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      intervalId = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        push({ t: performance.now(), db: rmsToDb(rmsOf(buffer)) });
      }, POLL_INTERVAL_MS);

      state = 'running';
    } catch (error) {
      teardown();
      state =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'denied'
          : 'error';
    }
  };

  const stop = (): void => {
    teardown();
    // A denied/unsupported/error verdict stands; stopping a running meter
    // returns it to idle, from which it can be started again.
    if (state === 'running') state = 'idle';
  };

  const windowDb = (ms: number): number | null => {
    if (ring.length === 0) return null;
    const cutoff = performance.now() - ms;

    let sum = 0;
    let count = 0;
    for (const sample of ring) {
      if (sample.t >= cutoff) {
        sum += sample.db;
        count += 1;
      }
    }
    if (count === 0) return null;
    return sum / count;
  };

  const dispose = (): void => {
    teardown();
    disposed = true;
    state = 'idle';
    ring.length = 0;
    ringHead = 0;
  };

  return {
    start,
    stop,
    getState: () => state,
    windowDb,
    current: latest,
    dispose,
  };
}
