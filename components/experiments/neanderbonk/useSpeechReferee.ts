import { useCallback, useEffect, useRef, useState } from 'react';
import { tokenize } from './rules';

/**
 * Microphone → words, via the browser's built-in speech recognition.
 *
 * This is the deliberately boring tier of the referee. The Web Speech API is a
 * few lines of code, ships with the browser, downloads no model, and needs no
 * new dependency — which is exactly what a first version wants. What it costs:
 *
 * - **Chrome-family only.** Safari and Firefox either lack it or implement it
 *   too partially to referee a game with. The page says so rather than failing
 *   mysteriously.
 * - **No control over the audio.** The API takes the microphone itself, so
 *   there is nowhere to insert noise suppression, speaker separation, or any
 *   pre-processing. That is the ceiling on this approach and the reason a real
 *   version would move to a streaming model fed from an `AudioWorklet`.
 * - **It may not be local.** Chrome has historically sent audio to a server for
 *   recognition. Treat the microphone as leaving the device and say so in the UI.
 *
 * ## Latency, and not judging a word twice
 *
 * Interim results arrive within a couple of hundred milliseconds but get revised
 * as the recogniser hears more. Waiting for `isFinal` would mean bonking someone
 * a second or more after they spoke, by which point the joke is dead.
 *
 * So interim results are judged, minus the last word — the one most likely to be
 * rewritten. Each result index remembers how many of its words have already been
 * emitted, so a word is judged exactly once even though its transcript arrives
 * repeatedly. A word already emitted and *then* revised keeps its original
 * ruling; that is the accepted cost of the latency, and it is what the Overrule
 * button is for.
 */

type SpeechAlternative = { readonly transcript: string };

type SpeechResult = {
  readonly length: number;
  readonly isFinal: boolean;
  readonly [index: number]: SpeechAlternative;
};

type SpeechResultList = {
  readonly length: number;
  readonly [index: number]: SpeechResult;
};

type SpeechResultEvent = {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
};

type SpeechErrorEvent = { readonly error: string; readonly message?: string };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/** The API is unprefixed in newer Chrome and `webkit`-prefixed in older. */
function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type RefereeStatus =
  | 'unsupported'
  | 'idle'
  | 'listening'
  | 'denied'
  | 'error';

/** Restart storms mean something is structurally wrong; stop rather than spin. */
const RESTART_LIMIT = 8;
const RESTART_WINDOW_MS = 10_000;

export type SpeechReferee = {
  readonly status: RefereeStatus;
  readonly error: string | null;
  /** The transcript still in flight, for display only — never judged as-is. */
  readonly interim: string;
  readonly start: () => void;
  readonly stop: () => void;
};

export function useSpeechReferee(options: {
  readonly lang: string;
  /** Called with each newly settled word, in order. */
  readonly onWords: (words: string[]) => void;
}): SpeechReferee {
  const { lang, onWords } = options;

  const [status, setStatus] = useState<RefereeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [interim, setInterim] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantListeningRef = useRef(false);
  /** resultIndex → how many of that result's words have been judged. */
  const emittedRef = useRef(new Map<number, number>());
  const restartsRef = useRef<number[]>([]);

  // Held in a ref so re-rendering the parent never re-binds the handlers.
  const onWordsRef = useRef(onWords);
  onWordsRef.current = onWords;
  const langRef = useRef(lang);
  langRef.current = lang;

  useEffect(() => {
    if (!getConstructor()) setStatus('unsupported');
  }, []);

  const handleResult = useCallback((event: SpeechResultEvent) => {
    const pending: string[] = [];
    let inFlight = '';

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const words = tokenize(result[0]?.transcript ?? '');

      // Hold back the final word of an interim transcript: it is the one the
      // recogniser is most likely to rewrite.
      const settled = result.isFinal
        ? words.length
        : Math.max(0, words.length - 1);
      const already = emittedRef.current.get(i) ?? 0;

      if (settled > already) {
        pending.push(...words.slice(already, settled));
        emittedRef.current.set(i, settled);
      }
      if (!result.isFinal) inFlight = words.join(' ');
    }

    setInterim(inFlight);
    if (pending.length > 0) onWordsRef.current(pending);
  }, []);

  const buildRecognition = useCallback((): SpeechRecognitionLike | null => {
    const Constructor = getConstructor();
    if (!Constructor) return null;

    const recognition = new Constructor();
    recognition.lang = langRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      // Result indices restart with each recognition session, so the
      // already-judged bookkeeping has to restart with them.
      emittedRef.current.clear();
      setStatus('listening');
      setError(null);
    };

    recognition.onresult = handleResult;

    recognition.onerror = (event) => {
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        wantListeningRef.current = false;
        setStatus('denied');
        setError(
          'Microphone blocked. Allow it in the address bar and try again.',
        );
        return;
      }
      // 'no-speech' and 'aborted' are routine in a quiet room; `onend` restarts.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.message || `Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setInterim('');
      if (!wantListeningRef.current) {
        setStatus('idle');
        return;
      }

      // Chrome ends the session on silence, so continuous listening means
      // restarting it — but a session that dies instantly, repeatedly, means
      // something is actually wrong.
      const now = performance.now();
      restartsRef.current = [
        ...restartsRef.current.filter((at) => now - at < RESTART_WINDOW_MS),
        now,
      ];
      if (restartsRef.current.length > RESTART_LIMIT) {
        wantListeningRef.current = false;
        setStatus('error');
        setError(
          'Speech recognition kept dropping out. Try reloading the page.',
        );
        return;
      }

      try {
        recognition.start();
      } catch {
        // Already starting — the pending session is the one we wanted anyway.
      }
    };

    return recognition;
  }, [handleResult]);

  const start = useCallback(() => {
    if (wantListeningRef.current) return;

    const recognition = recognitionRef.current ?? buildRecognition();
    if (!recognition) {
      setStatus('unsupported');
      return;
    }
    recognitionRef.current = recognition;
    recognition.lang = langRef.current;

    wantListeningRef.current = true;
    restartsRef.current = [];
    emittedRef.current.clear();

    try {
      recognition.start();
    } catch {
      // Start on an already-running instance throws; that is the state we want.
    }
  }, [buildRecognition]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    setInterim('');
    const recognition = recognitionRef.current;
    if (!recognition) {
      setStatus('idle');
      return;
    }
    // abort() rather than stop(): stop() flushes a final result, which would
    // arrive after the round has closed and score against nobody.
    recognition.abort();
    setStatus('idle');
  }, []);

  // Never leave the microphone open behind a route change.
  useEffect(
    () => () => {
      wantListeningRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return { status, error, interim, start, stop };
}
