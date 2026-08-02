import { AudioLines, Fingerprint, Mic, MicOff, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createBonker } from '../bonk';
import { judgeWord, type Ruling } from '../rules';
import { type Lexicon, loadLexicon } from '../syllables';
import { useSpeechReferee } from '../useSpeechReferee';
import {
  classifyNearField,
  type NearFieldCalibration,
  rmsOf,
  rmsToDb,
} from './levelMeter';
import {
  buildProfile,
  classifySpeaker,
  extractFeatures,
  type SpeakerCall,
  scoreSegment,
  type VoiceFeatures,
  type VoiceProfile,
} from './voiceProfile';

/**
 * VoiceLab — can the referee tell WHO is speaking?
 *
 * The game's known weakness: the Web Speech API transcribes everyone equally,
 * so a guesser shouting near the mic gets the poet bonked. This bench runs the
 * candidate fixes side by side on the same audio and lets them disagree:
 *
 * - **Approach A — loudness gate.** The poet holds the phone; near-field
 *   speech is 15–20 dB louder. Calibrated during enrolment, thresholds only.
 * - **Approach B — voice profile.** Classical DSP speaker similarity: pitch +
 *   spectral shape enrolled from a few seconds of the poet, then per-segment
 *   scoring. No model download; honest about being a baseline.
 * - **Approach C — speaker embeddings** (the VoiceFilter-style d-vector route)
 *   is research-stage; see docs/neanderbonk-voice-approach-c.md.
 *
 * The page is also the feasibility probe for backlog item 8: it runs
 * `getUserMedia` analysis *alongside* the Web Speech API — two consumers of
 * one microphone — and reports whether the browser tolerates that at all.
 *
 * One deliberate mechanic: the bonk buzzer only fires when the selected
 * approach attributes the offending speech to the poet. Watching which gate
 * stops a false bonk (and which lets a real one through) is the experiment.
 */

type Attribution = {
  readonly db: number | null;
  readonly nearField: 'near' | 'far' | 'uncertain' | null;
  readonly similarity: number | null;
  readonly speaker: SpeakerCall | null;
};

type LabWord = Ruling &
  Attribution & {
    readonly id: number;
  };

type FrameRecord = {
  readonly t: number;
  readonly db: number;
  readonly features: VoiceFeatures;
};

type PumpState = 'idle' | 'running' | 'denied' | 'unsupported' | 'error';

type GateMode = 'off' | 'level' | 'voice' | 'both';

const FRAME_SIZE = 2048;
const POLL_MS = 50;
/** Attribution looks at speech from the last moment; recogniser lag is real. */
const SEGMENT_WINDOW_MS = 1800;

const CALL_STYLE: Record<string, string> = {
  near: 'text-brutalist-cyan',
  poet: 'text-brutalist-cyan',
  far: 'text-brutalist-pink',
  other: 'text-brutalist-pink',
  uncertain: 'text-brutalist-yellow',
};

/**
 * One microphone stream feeding every approach: an AnalyserNode polled on a
 * timer. AGC and noise suppression are disabled because they would erase the
 * very level difference the loudness gate depends on.
 */
function useFramePump() {
  const [state, setState] = useState<PumpState>('idle');
  const framesRef = useRef<FrameRecord[]>([]);
  const stopRef = useRef<(() => void) | null>(null);

  const start = useCallback(async () => {
    if (stopRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setState('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = FRAME_SIZE;
      source.connect(analyser);

      const buffer = new Float32Array(FRAME_SIZE);
      const interval = window.setInterval(() => {
        analyser.getFloatTimeDomainData(buffer);
        const frame = buffer.slice();
        const record: FrameRecord = {
          t: performance.now(),
          db: rmsToDb(rmsOf(frame)),
          features: extractFeatures(frame, context.sampleRate),
        };
        const kept = framesRef.current.filter((f) => record.t - f.t < 10_000);
        kept.push(record);
        framesRef.current = kept;
      }, POLL_MS);

      stopRef.current = () => {
        window.clearInterval(interval);
        for (const track of stream.getTracks()) track.stop();
        context.close().catch(() => {});
        stopRef.current = null;
        setState('idle');
      };
      setState('running');
    } catch (cause) {
      setState(
        cause instanceof DOMException && cause.name === 'NotAllowedError'
          ? 'denied'
          : 'error',
      );
    }
  }, []);

  const stop = useCallback(() => stopRef.current?.(), []);

  useEffect(() => () => stopRef.current?.(), []);

  const recent = useCallback((ms: number) => {
    const now = performance.now();
    return framesRef.current.filter((f) => now - f.t < ms);
  }, []);

  return { state, start, stop, recent };
}

export default function VoiceLab() {
  const [target, setTarget] = useState('');
  const [words, setWords] = useState<LabWord[]>([]);
  const [gateMode, setGateMode] = useState<GateMode>('level');

  const [lexicon, setLexicon] = useState<Lexicon | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    loadLexicon(controller.signal)
      .then(setLexicon)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const pump = useFramePump();

  // ── Enrolment ────────────────────────────────────────────────────────────
  const [enrolling, setEnrolling] = useState(false);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [calibration, setCalibration] = useState<NearFieldCalibration | null>(
    null,
  );
  const enrolStartRef = useRef(0);

  const beginEnrol = useCallback(async () => {
    await pump.start();
    enrolStartRef.current = performance.now();
    setEnrolling(true);
  }, [pump]);

  const endEnrol = useCallback(() => {
    setEnrolling(false);
    const took = performance.now() - enrolStartRef.current;
    const frames = pump.recent(took);
    const voiced = frames.filter((f) => f.features.pitchHz !== null);
    setProfile(buildProfile(frames.map((f) => f.features)));
    if (voiced.length > 0) {
      const dbs = voiced.map((f) => f.db).sort((a, b) => a - b);
      const all = frames.map((f) => f.db).sort((a, b) => a - b);
      setCalibration({
        // Median voiced level while the poet held the phone and spoke.
        nearDb: dbs[Math.floor(dbs.length / 2)],
        // The quietest stretch stands in for the room's noise floor.
        floorDb: all[Math.floor(all.length * 0.05)],
      });
    }
  }, [pump]);

  // ── Live judging with attribution ────────────────────────────────────────
  const bonkerRef = useRef(createBonker());
  useEffect(() => {
    const bonker = bonkerRef.current;
    return () => bonker.dispose();
  }, []);

  const nextIdRef = useRef(0);
  const liveRef = useRef({
    target,
    lexicon,
    profile,
    calibration,
    gateMode,
  });
  liveRef.current = { target, lexicon, profile, calibration, gateMode };

  const handleWords = useCallback(
    (incoming: string[]) => {
      const {
        target: liveTarget,
        lexicon: lex,
        profile: prof,
        calibration: cal,
        gateMode: gate,
      } = liveRef.current;

      const segment = pump.recent(SEGMENT_WINDOW_MS);
      const voiced = segment.map((f) => f.features);
      const dbs = segment.map((f) => f.db).sort((a, b) => a - b);
      // Speech level ≈ the loud end of the window, not its average — the
      // window includes the gaps between words.
      const db = dbs.length > 0 ? dbs[Math.floor(dbs.length * 0.9)] : null;
      const nearField = db !== null && cal ? classifyNearField(db, cal) : null;
      const similarity = prof ? scoreSegment(voiced, prof) : null;
      const speaker = prof ? classifySpeaker(similarity) : null;

      const judged: LabWord[] = [];
      for (const word of incoming) {
        const ruling = judgeWord(word, liveTarget.trim(), 'standard', lex);
        if (ruling.exempt) continue;
        nextIdRef.current += 1;
        judged.push({
          ...ruling,
          id: nextIdRef.current,
          db,
          nearField,
          similarity,
          speaker,
        });
      }
      if (judged.length === 0) return;
      setWords((previous) => [...previous, ...judged].slice(-80));

      // The gate: a bonk only sounds if the selected approach blames the poet.
      const bonked = judged.some((w) => w.verdict === 'bonk');
      if (!bonked) return;
      const levelSaysPoet = nearField !== 'far';
      const voiceSaysPoet = speaker !== 'other';
      const fire =
        gate === 'off'
          ? true
          : gate === 'level'
            ? levelSaysPoet
            : gate === 'voice'
              ? voiceSaysPoet
              : levelSaysPoet && voiceSaysPoet;
      if (fire) bonkerRef.current.bonk();
    },
    [pump],
  );

  const referee = useSpeechReferee({ lang: 'en-GB', onWords: handleWords });
  const listening = referee.status === 'listening';

  const startListening = useCallback(async () => {
    bonkerRef.current.arm();
    await pump.start();
    referee.start();
  }, [pump, referee]);

  const stopListening = useCallback(() => {
    referee.stop();
    pump.stop();
  }, [pump, referee]);

  const bothRunning = listening && pump.state === 'running';

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      {/* ── Feasibility ────────────────────────────────────────────────── */}
      <section className="border-2 border-brutalist-yellow bg-zinc-900 p-4 sm:p-6">
        <h2 className="mb-3 font-display text-sm font-bold uppercase text-brutalist-yellow sm:text-base">
          [ TWO MIC CONSUMERS — THE FEASIBILITY QUESTION ]
        </h2>
        <p className="mb-3 font-mono text-xs text-zinc-400">
          Speaker attribution needs raw audio, but transcription already owns
          the microphone through the Web Speech API. This page runs both at
          once; whether that works in your browser is itself a result.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border-2 border-white bg-black p-3">
            <p className="font-mono text-[10px] uppercase text-zinc-400">
              Speech API
            </p>
            <p className="font-mono text-sm font-bold text-white">
              {referee.status.toUpperCase()}
            </p>
          </div>
          <div className="border-2 border-white bg-black p-3">
            <p className="font-mono text-[10px] uppercase text-zinc-400">
              Raw audio
            </p>
            <p className="font-mono text-sm font-bold text-white">
              {pump.state.toUpperCase()}
            </p>
          </div>
          <div className="border-2 border-white bg-black p-3">
            <p className="font-mono text-[10px] uppercase text-zinc-400">
              Verdict
            </p>
            <p
              className={`font-mono text-sm font-bold ${
                bothRunning ? 'text-brutalist-cyan' : 'text-white'
              }`}
            >
              {bothRunning
                ? 'CO-EXIST ✓'
                : listening || pump.state === 'running'
                  ? 'PARTIAL'
                  : 'NOT RUNNING'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Enrolment ──────────────────────────────────────────────────── */}
      <section className="border-2 border-brutalist-cyan bg-zinc-900 p-4 sm:p-6">
        <h2 className="mb-3 font-display text-sm font-bold uppercase text-brutalist-cyan sm:text-base">
          [ ENROL THE POET ]
        </h2>
        <p className="mb-3 font-mono text-xs text-zinc-400">
          Hold the button, hold the phone as the poet would, and speak normally
          for ~5 seconds. This calibrates both approaches at once: the
          near-field level for the loudness gate and the voice profile for the
          similarity score.
        </p>
        <button
          type="button"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            void beginEnrol();
          }}
          onPointerUp={endEnrol}
          onPointerCancel={endEnrol}
          onKeyDown={(event) => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            if (!enrolling) void beginEnrol();
          }}
          onKeyUp={(event) => {
            if (event.key === ' ' || event.key === 'Enter') endEnrol();
          }}
          className={`w-full touch-none select-none border-2 px-4 py-4 font-mono text-sm font-bold uppercase transition-colors ${
            enrolling
              ? 'border-brutalist-cyan bg-brutalist-cyan text-black'
              : 'border-brutalist-cyan text-brutalist-cyan hover:bg-brutalist-cyan hover:text-black'
          }`}
        >
          <Fingerprint className="mr-2 inline h-4 w-4" aria-hidden />
          {enrolling ? 'Listening — keep talking' : 'Hold to enrol'}
        </button>
        <div className="mt-3 grid gap-3 font-mono text-xs sm:grid-cols-2">
          <p className="text-zinc-400">
            <Volume2
              className="mr-1 inline h-3 w-3 align-[-2px] text-brutalist-cyan"
              aria-hidden
            />
            Loudness:{' '}
            {calibration
              ? `near ≈ ${calibration.nearDb.toFixed(0)} dBFS, floor ≈ ${calibration.floorDb.toFixed(0)} dBFS`
              : 'not calibrated'}
          </p>
          <p className="text-zinc-400">
            <AudioLines
              className="mr-1 inline h-3 w-3 align-[-2px] text-brutalist-cyan"
              aria-hidden
            />
            Voice:{' '}
            {profile
              ? `pitch ≈ ${profile.pitchHz.toFixed(0)} Hz over ${profile.frames} frames`
              : 'no profile — too little voiced speech'}
          </p>
        </div>
      </section>

      {/* ── Live bench ─────────────────────────────────────────────────── */}
      <section className="border-2 border-brutalist-pink bg-zinc-900 p-4 sm:p-6">
        <h2 className="mb-3 font-display text-sm font-bold uppercase text-brutalist-pink sm:text-base">
          [ LIVE — WHO GETS THE BONK? ]
        </h2>

        <label className="mb-3 block">
          <span className="font-mono text-[10px] uppercase text-zinc-400">
            Target word (optional)
          </span>
          <input
            type="text"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="e.g. bear"
            autoComplete="off"
            className="mt-1 w-full border-2 border-white bg-black px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-brutalist-pink focus:outline-none"
          />
        </label>

        <fieldset className="mb-3">
          <legend className="mb-2 font-mono text-[10px] uppercase text-zinc-400">
            Bonk noise gate — only buzz when the speech is attributed to the
            poet by…
          </legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['off', 'no gate'],
                ['level', 'loudness (A)'],
                ['voice', 'voice profile (B)'],
                ['both', 'both agree'],
              ] as const
            ).map(([option, label]) => (
              <button
                key={option}
                type="button"
                onClick={() => setGateMode(option)}
                aria-pressed={gateMode === option}
                className={`border-2 px-3 py-1 font-mono text-xs uppercase transition-colors ${
                  gateMode === option
                    ? 'border-brutalist-pink text-brutalist-pink'
                    : 'border-zinc-600 text-zinc-400 hover:border-white hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={listening ? stopListening : () => void startListening()}
          className={`flex w-full items-center justify-center gap-2 border-2 px-4 py-3 font-mono text-xs font-bold uppercase transition-colors ${
            listening
              ? 'border-brutalist-pink bg-brutalist-pink text-black'
              : 'border-white text-white hover:bg-white hover:text-black'
          }`}
        >
          {listening ? (
            <Mic className="h-4 w-4" aria-hidden />
          ) : (
            <MicOff className="h-4 w-4" aria-hidden />
          )}
          {listening ? 'Stop' : 'Listen (open mic — that is the point here)'}
        </button>

        {referee.error ? (
          <p className="mt-3 border-2 border-brutalist-pink bg-black p-3 font-mono text-xs text-brutalist-pink">
            {referee.error}
          </p>
        ) : null}

        <p className="mt-3 font-mono text-[10px] uppercase text-zinc-500">
          Try it: enrol yourself, then have someone else lean in and shout a
          three-syllable word. Whose bonk is it?
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase text-zinc-400">
                <th className="py-1 pr-3">Word</th>
                <th className="py-1 pr-3">Verdict</th>
                <th className="py-1 pr-3">Level</th>
                <th className="py-1 pr-3">A: field</th>
                <th className="py-1 pr-3">Similarity</th>
                <th className="py-1">B: speaker</th>
              </tr>
            </thead>
            <tbody>
              {words.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-zinc-600">
                    nothing heard yet
                  </td>
                </tr>
              ) : (
                [...words].reverse().map((word) => (
                  <tr
                    key={word.id}
                    className="border-t border-zinc-800 align-top"
                  >
                    <td className="py-1.5 pr-3 text-white">{word.word}</td>
                    <td className="py-1.5 pr-3">
                      <span
                        className={`border px-1.5 py-0.5 uppercase ${
                          word.verdict === 'bonk'
                            ? 'border-brutalist-pink text-brutalist-pink'
                            : word.verdict === 'flag'
                              ? 'border-brutalist-yellow text-brutalist-yellow'
                              : 'border-zinc-600 text-zinc-400'
                        }`}
                      >
                        {word.verdict}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-400">
                      {word.db === null ? '—' : `${word.db.toFixed(0)} dB`}
                    </td>
                    <td
                      className={`py-1.5 pr-3 ${word.nearField ? CALL_STYLE[word.nearField] : 'text-zinc-600'}`}
                    >
                      {word.nearField ?? 'not calibrated'}
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-400">
                      {word.similarity === null
                        ? '—'
                        : word.similarity.toFixed(2)}
                    </td>
                    <td
                      className={`py-1.5 ${word.speaker ? CALL_STYLE[word.speaker] : 'text-zinc-600'}`}
                    >
                      {word.speaker ?? 'not enrolled'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
