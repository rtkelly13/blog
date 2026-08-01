import { Eraser, FlaskConical, Mic, MicOff, Type } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  explainRuling,
  judgeWord,
  type Ruling,
  STRICTNESS_BLURB,
  STRICTNESS_ORDER,
  type Strictness,
  tokenize,
} from './rules';
import { type Lexicon, loadLexicon } from './syllables';
import { useSpeechReferee } from './useSpeechReferee';

/**
 * RefereeLab — the NeanderBonk judging pipeline with the game stripped away.
 *
 * No rounds, scores, teams, clock, or bonk dialog: just target word,
 * strictness, and a stream of rulings. Two ways in, deliberately:
 *
 * - **Type to judge** — deterministic, works everywhere, no permissions. This
 *   is the fastest way to see exactly how a word will be ruled.
 * - **Open mic** — the real pipeline including the speech recogniser and its
 *   revisions. A toggle rather than hold-to-talk: this is a lab bench, not a
 *   game, and there is nobody to falsely accuse.
 *
 * Everything a ruling knows is shown — verdict, syllable range, count source
 * (lexicon vs heuristic), reason — including fillers the game would silently
 * skip. Transparency is the point of the page.
 */

type LabEntry = Ruling & {
  readonly id: number;
  /** Whether the word arrived by microphone or keyboard. */
  readonly via: 'mic' | 'typed';
};

const VERDICT_STYLE = {
  clean: 'border-zinc-600 text-zinc-400',
  flag: 'border-brutalist-yellow text-brutalist-yellow',
  bonk: 'border-brutalist-pink text-brutalist-pink',
} as const;

export default function RefereeLab() {
  const [strictness, setStrictness] = useState<Strictness>('standard');
  const [target, setTarget] = useState('');
  const [typed, setTyped] = useState('');
  const [entries, setEntries] = useState<LabEntry[]>([]);

  const [lexicon, setLexicon] = useState<Lexicon | null>(null);
  const [lexiconFailed, setLexiconFailed] = useState(false);

  const nextIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    loadLexicon(controller.signal)
      .then(setLexicon)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setLexiconFailed(true);
        console.warn('RefereeLab: lexicon unavailable', cause);
      });
    return () => controller.abort();
  }, []);

  // The speech callback outlives renders, so it reads current state via a ref.
  const liveRef = useRef({ target, strictness, lexicon });
  liveRef.current = { target, strictness, lexicon };

  const judge = useCallback((words: string[], via: LabEntry['via']) => {
    const {
      target: liveTarget,
      strictness: mode,
      lexicon: lex,
    } = liveRef.current;
    if (words.length === 0) return;
    setEntries((previous) =>
      [
        ...previous,
        ...words.map((word) => {
          nextIdRef.current += 1;
          return {
            ...judgeWord(word, liveTarget.trim(), mode, lex),
            id: nextIdRef.current,
            via,
          };
        }),
      ].slice(-200),
    );
  }, []);

  const handleWords = useCallback(
    (incoming: string[]) => judge(incoming, 'mic'),
    [judge],
  );

  const referee = useSpeechReferee({ lang: 'en-GB', onWords: handleWords });
  const listening = referee.status === 'listening';
  const unsupported = referee.status === 'unsupported';

  const judgeTyped = useCallback(() => {
    judge(tokenize(typed), 'typed');
    setTyped('');
  }, [judge, typed]);

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      {/* ── Status ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-2 border-white bg-zinc-900 p-3">
          <p className="font-mono text-[10px] uppercase text-zinc-400">Mic</p>
          <p
            className={`flex items-center gap-2 font-mono text-sm font-bold ${
              listening ? 'text-brutalist-pink' : 'text-white'
            }`}
          >
            {listening ? (
              <Mic className="h-4 w-4" aria-hidden />
            ) : (
              <MicOff className="h-4 w-4" aria-hidden />
            )}
            {referee.status === 'denied'
              ? 'BLOCKED'
              : listening
                ? 'LISTENING'
                : unsupported
                  ? 'UNAVAILABLE'
                  : 'OFF'}
          </p>
        </div>
        <div className="border-2 border-white bg-zinc-900 p-3">
          <p className="font-mono text-[10px] uppercase text-zinc-400">
            Lexicon
          </p>
          <p className="font-mono text-sm font-bold text-white">
            {lexicon
              ? `${(lexicon.size / 1000).toFixed(0)}K WORDS`
              : lexiconFailed
                ? 'HEURISTIC ONLY'
                : 'LOADING…'}
          </p>
        </div>
      </div>

      {referee.error ? (
        <p className="border-2 border-brutalist-pink bg-zinc-900 p-3 font-mono text-xs text-brutalist-pink">
          {referee.error}
        </p>
      ) : null}

      {/* ── Bench setup ────────────────────────────────────────────────── */}
      <section className="border-2 border-brutalist-cyan bg-zinc-900 p-4 sm:p-6">
        <h2 className="mb-4 font-display text-sm font-bold uppercase text-brutalist-cyan sm:text-base">
          [ BENCH ]
        </h2>

        <label className="block">
          <span className="font-mono text-[10px] uppercase text-zinc-400">
            Target word — leave empty to test syllable counting alone
          </span>
          <input
            type="text"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="e.g. bear"
            autoComplete="off"
            className="mt-1 w-full border-2 border-white bg-black px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-brutalist-cyan focus:outline-none"
          />
        </label>

        <fieldset className="mt-5">
          <legend className="mb-2 font-mono text-[10px] uppercase text-zinc-400">
            Strictness
          </legend>
          <div className="flex flex-wrap gap-2">
            {STRICTNESS_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setStrictness(option)}
                aria-pressed={strictness === option}
                className={`border-2 px-3 py-1 font-mono text-xs uppercase transition-colors ${
                  strictness === option
                    ? 'border-brutalist-cyan text-brutalist-cyan'
                    : 'border-zinc-600 text-zinc-400 hover:border-white hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-xs text-zinc-400">
            {STRICTNESS_BLURB[strictness]}
          </p>
        </fieldset>
      </section>

      {/* ── Inputs ─────────────────────────────────────────────────────── */}
      <section className="border-2 border-brutalist-pink bg-zinc-900 p-4 sm:p-6">
        <h2 className="mb-4 font-display text-sm font-bold uppercase text-brutalist-pink sm:text-base">
          [ FEED IT WORDS ]
        </h2>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            judgeTyped();
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            type="text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="type a phrase and judge it"
            autoComplete="off"
            aria-label="Words to judge"
            className="flex-1 border-2 border-white bg-black px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-brutalist-pink focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 border-2 border-brutalist-pink px-4 py-2 font-mono text-xs font-bold uppercase text-brutalist-pink transition-colors hover:bg-brutalist-pink hover:text-black"
          >
            <Type className="h-4 w-4" aria-hidden /> Judge
          </button>
        </form>

        {!unsupported ? (
          <button
            type="button"
            onClick={listening ? referee.stop : referee.start}
            className={`mt-3 flex w-full items-center justify-center gap-2 border-2 px-4 py-3 font-mono text-xs font-bold uppercase transition-colors ${
              listening
                ? 'border-brutalist-pink bg-brutalist-pink text-black'
                : 'border-white text-white hover:bg-white hover:text-black'
            }`}
          >
            <Mic className="h-4 w-4" aria-hidden />
            {listening ? 'Stop listening' : 'Listen (open mic)'}
          </button>
        ) : (
          <p className="mt-3 font-mono text-xs text-zinc-400">
            No speech recognition in this browser — Chrome or Edge for the mic;
            typing works everywhere.
          </p>
        )}

        {referee.interim ? (
          <p className="mt-2 font-mono text-xs italic text-zinc-500">
            hearing: {referee.interim}…
          </p>
        ) : null}
      </section>

      {/* ── Rulings ────────────────────────────────────────────────────── */}
      <section className="border-2 border-brutalist-yellow bg-zinc-900 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase text-brutalist-yellow sm:text-base">
            [ RULINGS ]
          </h2>
          {entries.length > 0 ? (
            <button
              type="button"
              onClick={() => setEntries([])}
              className="flex items-center gap-2 border-2 border-zinc-600 px-3 py-1 font-mono text-[10px] uppercase text-zinc-400 transition-colors hover:border-white hover:text-white"
            >
              <Eraser className="h-3 w-3" aria-hidden /> Clear
            </button>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <p className="flex items-center gap-2 font-mono text-xs text-zinc-600">
            <FlaskConical className="h-4 w-4" aria-hidden />
            nothing judged yet — type a phrase above
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-zinc-400">
                  <th className="py-1 pr-3">Word</th>
                  <th className="py-1 pr-3">Verdict</th>
                  <th className="py-1 pr-3">Syllables</th>
                  <th className="py-1 pr-3">Source</th>
                  <th className="py-1 pr-3">Via</th>
                  <th className="py-1">Why</th>
                </tr>
              </thead>
              <tbody>
                {[...entries].reverse().map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-zinc-800 align-top"
                  >
                    <td className="py-1.5 pr-3 text-white">{entry.word}</td>
                    <td className="py-1.5 pr-3">
                      {entry.exempt ? (
                        <span className="border border-zinc-700 px-1.5 py-0.5 text-zinc-600">
                          skipped
                        </span>
                      ) : (
                        <span
                          className={`border px-1.5 py-0.5 uppercase ${VERDICT_STYLE[entry.verdict]}`}
                        >
                          {entry.verdict}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-400">
                      {entry.syllables.min === entry.syllables.max
                        ? entry.syllables.min
                        : `${entry.syllables.min}–${entry.syllables.max}`}
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-400">
                      {entry.syllables.source}
                    </td>
                    <td className="py-1.5 pr-3 text-zinc-500">{entry.via}</td>
                    <td className="py-1.5 text-zinc-400">
                      {entry.exempt
                        ? 'filler — the game ignores these'
                        : explainRuling(entry)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
