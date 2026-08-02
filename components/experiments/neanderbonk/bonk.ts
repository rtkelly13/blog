/**
 * The buzzer.
 *
 * Synthesised with Web Audio rather than shipped as an audio file: no asset to
 * download on a page that already fetches a lexicon, no `media-src` to widen in
 * the site CSP, and a square-wave thunk suits the aesthetic better than a
 * stock sound effect would.
 *
 * The app does not replace the inflatable club — it *authorises* it. The buzzer
 * and the red flash tell a human they are licensed to swing, which is the whole
 * joke and not something worth automating away.
 */

export type Bonker = {
  /** Call from a user gesture; browsers refuse to start audio without one. */
  readonly arm: () => void;
  readonly bonk: () => void;
  readonly flag: () => void;
  readonly dispose: () => void;
};

type AudioContextConstructor = new () => AudioContext;

function getAudioContext(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** A silent no-op bonker, for browsers without Web Audio. */
const NOOP: Bonker = {
  arm: () => {},
  bonk: () => {},
  flag: () => {},
  dispose: () => {},
};

export function createBonker(): Bonker {
  const Constructor = getAudioContext();
  if (!Constructor) return NOOP;

  let context: AudioContext | null = null;

  const ensure = (): AudioContext | null => {
    if (!context) {
      try {
        context = new Constructor();
      } catch {
        return null;
      }
    }
    // Browsers suspend the context until a gesture, and again on tab blur.
    if (context.state === 'suspended') void context.resume();
    return context;
  };

  /** One enveloped oscillator. Gain ramps avoid the click of a hard stop. */
  const tone = (
    ctx: AudioContext,
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    peak: number,
    delay = 0,
  ) => {
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, to),
      start + duration,
    );

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  };

  const vibrate = (pattern: number[]) => {
    if (typeof navigator === 'undefined') return;
    // Absent on iOS Safari; the flash and the buzzer carry it there.
    navigator.vibrate?.(pattern);
  };

  return {
    arm: () => {
      ensure();
    },

    bonk: () => {
      const ctx = ensure();
      if (!ctx) return;
      // Two descending square waves a beat apart: a cartoon double-thunk.
      tone(ctx, 'square', 180, 60, 0.16, 0.22);
      tone(ctx, 'square', 140, 45, 0.22, 0.2, 0.13);
      vibrate([0, 110, 60, 160]);
    },

    flag: () => {
      const ctx = ensure();
      if (!ctx) return;
      // Quieter and higher — a raised eyebrow, not an accusation.
      tone(ctx, 'triangle', 660, 620, 0.07, 0.07);
      vibrate([0, 35]);
    },

    dispose: () => {
      void context?.close();
      context = null;
    },
  };
}
