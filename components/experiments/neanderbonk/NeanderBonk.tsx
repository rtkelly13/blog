import {
  Check,
  Gavel,
  Mic,
  MicOff,
  RotateCcw,
  SkipForward,
  Timer,
  TriangleAlert,
  Undo2,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBonker } from './bonk';
import {
  explainRuling,
  judgeWord,
  type Ruling,
  STRICTNESS_BLURB,
  STRICTNESS_ORDER,
  type Strictness,
} from './rules';
import { type Lexicon, loadLexicon } from './syllables';
import { useSpeechReferee } from './useSpeechReferee';
import { type Card, STARTER_DECK, shuffled } from './words';

/**
 * NeanderBonk — an automatic referee for Poetry for Neanderthals.
 *
 * The poet may only use single-syllable words. This listens, counts syllables,
 * and calls the bonk. Client-only (microphone, Web Audio, a 950 KB lexicon
 * fetched on demand), so the page loads it through `next/dynamic` with
 * `ssr: false` and nothing here reaches any other route's bundle.
 *
 * The design decisions worth knowing, all of which follow from one asymmetry —
 * a missed violation costs nothing, a false accusation ruins the game:
 *
 * - **Three verdicts, not two.** Certain violations bonk; suspected ones flag
 *   and leave it to the table. Ambiguous pronunciations and words the lexicon
 *   has never heard of can only ever flag.
 * - **Overrule is always one tap away**, and it puts the card back in play.
 * - **The app authorises the bonk; a human still swings the club.**
 * - **No speaker separation.** The browser's speech API takes the microphone
 *   itself, so there is nowhere to insert it — which is why the phone belongs in
 *   the poet's hand, and why "hold to clue" is the recommended mode. Anyone
 *   shouting a guess near an open mic will get the poet bonked.
 */

type MicMode = 'open' | 'hold';
type Tier = 'easy' | 'hard';
type RoundState = 'idle' | 'live' | 'over';
type Outcome = 'won' | 'bonked' | 'passed';

type JudgedWord = Ruling & { readonly id: number };

type LogEntry = {
  readonly id: number;
  readonly target: string;
  readonly outcome: Outcome;
  readonly detail: string;
  readonly points: number;
  readonly team: number;
  /** The word that drew the bonk, when the outcome is a bonk. */
  readonly word?: string;
};

type PendingBonk = {
  readonly ruling: Ruling;
  readonly target: string;
  /** Which word in the transcript strip to un-mark if the ruling is overruled. */
  readonly wordId: number;
};

const ROUND_LENGTHS = [60, 90, 120] as const;
const TEAM_NAMES = ['ROCK', 'STICK'] as const;
const POINTS: Record<Tier, number> = { easy: 1, hard: 3 };

/**
 * Open mic judges everyone within earshot as the poet — guessers included —
 * which produces exactly the false bonks the whole design exists to avoid. It
 * survives only as a development convenience; players get hold-to-clue.
 */
const OPEN_MIC_AVAILABLE = process.env.NODE_ENV !== 'production';

const STORAGE_KEY = 'neanderbonk:game:v1';

type SavedGame = {
  readonly scores: number[];
  readonly log: LogEntry[];
  readonly team: number;
};

/** A refresh should not lose the game. Anything malformed is a fresh game. */
function loadSavedGame(): SavedGame | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGame;
    if (
      !Array.isArray(parsed.scores) ||
      parsed.scores.length !== TEAM_NAMES.length ||
      !parsed.scores.every((score) => typeof score === 'number') ||
      !Array.isArray(parsed.log) ||
      typeof parsed.team !== 'number' ||
      parsed.team < 0 ||
      parsed.team >= TEAM_NAMES.length
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const VERDICT_STYLE = {
  clean: 'border-zinc-600 text-zinc-400',
  flag: 'border-brutalist-yellow text-brutalist-yellow',
  bonk: 'border-brutalist-pink text-brutalist-pink',
} as const;

/**
 * The limits, on the page rather than only in a commit message.
 *
 * Every one of these is a way the referee can be wrong, and a player who knows
 * them can work around them. Silent degradation is what destroys trust in a
 * thing like this.
 */
const CAVEATS = [
  'It cannot tell who is speaking. The browser’s speech API takes the microphone itself, leaving nowhere to insert speaker separation, so a guesser shouting near an open mic gets the poet bonked. Hold-to-clue with the phone in the poet’s hand is the workaround, and it is a good one: near-field speech is 15–20 dB louder than the rest of the room.',
  'Your voice may leave the device. Chrome has historically sent audio to a server for recognition. Assume it does.',
  'It judges words a beat late, and a word already ruled on can be revised by the recogniser afterwards. That is what Overrule is for.',
  'Syllable counts come from the CMU Pronouncing Dictionary, which is American. Ambiguous words are forgiven rather than called, so British and Irish pronunciations lose bonks rather than gaining false ones.',
  'It does not know homophones. Say “bare” for a card reading BEAR and it will not notice.',
] as const;

function formatClock(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clamped / 60);
  return `${minutes}:${String(clamped % 60).padStart(2, '0')}`;
}

/** Bracketed section frame, matching the rest of the site's panels. */
function Panel({
  title,
  accent = 'cyan',
  children,
}: {
  title: string;
  accent?: 'cyan' | 'pink' | 'yellow';
  children: React.ReactNode;
}) {
  const border = {
    cyan: 'border-brutalist-cyan',
    pink: 'border-brutalist-pink',
    yellow: 'border-brutalist-yellow',
  }[accent];
  const text = {
    cyan: 'text-brutalist-cyan',
    pink: 'text-brutalist-pink',
    yellow: 'text-brutalist-yellow',
  }[accent];

  return (
    <section className={`border-2 ${border} bg-zinc-900 p-4 sm:p-6`}>
      <h2
        className={`mb-4 font-display text-sm font-bold uppercase sm:text-base ${text}`}
      >
        [ {title} ]
      </h2>
      {children}
    </section>
  );
}

export default function NeanderBonk() {
  // ── Setup ────────────────────────────────────────────────────────────────
  const [strictness, setStrictness] = useState<Strictness>('standard');
  const [micMode, setMicMode] = useState<MicMode>('hold');
  const [roundLength, setRoundLength] = useState<number>(90);

  // ── Lexicon ──────────────────────────────────────────────────────────────
  const [lexicon, setLexicon] = useState<Lexicon | null>(null);
  const [lexiconFailed, setLexiconFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadLexicon(controller.signal)
      .then(setLexicon)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        // Heuristic-only is a usable degraded mode: it flags instead of bonking.
        setLexiconFailed(true);
        console.warn('NeanderBonk: lexicon unavailable', cause);
      });
    return () => controller.abort();
  }, []);

  // ── Deck ─────────────────────────────────────────────────────────────────
  const [deck, setDeck] = useState<readonly Card[]>(() =>
    shuffled(STARTER_DECK),
  );
  const [cardIndex, setCardIndex] = useState(0);
  const [tier, setTier] = useState<Tier>('easy');
  const [customTarget, setCustomTarget] = useState('');

  const card = deck[cardIndex % deck.length];
  const target = customTarget.trim() || card[tier];

  // ── Round ────────────────────────────────────────────────────────────────
  // Scores, log, and whose turn it is survive a refresh; live-round state
  // (clock, transcript) deliberately does not — a reload mid-round is a reset
  // of the round, not of the game.
  const [saved] = useState(loadSavedGame);
  const [roundState, setRoundState] = useState<RoundState>('idle');
  const [team, setTeam] = useState(saved?.team ?? 0);
  const [scores, setScores] = useState<number[]>(saved?.scores ?? [0, 0]);
  const [remaining, setRemaining] = useState(roundLength);
  const [words, setWords] = useState<JudgedWord[]>([]);
  const [pendingBonk, setPendingBonk] = useState<PendingBonk | null>(null);
  const [log, setLog] = useState<LogEntry[]>(saved?.log ?? []);

  const bonkerRef = useRef(createBonker());
  // Ids must resume above anything restored, or restored log keys collide.
  const nextIdRef = useRef(
    saved ? Math.max(0, ...saved.log.map((entry) => entry.id)) : 0,
  );
  const deadlineRef = useRef<number | null>(null);
  const overruleRef = useRef<HTMLButtonElement | null>(null);

  // ── Mic check ────────────────────────────────────────────────────────────
  // A permissions problem should surface before the round starts, not with the
  // clock running. Held like the clue button; heard words echo back, unjudged.
  const [micCheck, setMicCheck] = useState(false);
  const [micCheckHeard, setMicCheckHeard] = useState<string[]>([]);

  // Persist the game, not the round. Saving on every change is cheap at this
  // size (40-entry log cap) and means there is no moment to forget.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ scores, log, team } satisfies SavedGame),
      );
    } catch {
      // Storage full or blocked — the game still works, it just won't survive.
    }
  }, [scores, log, team]);

  // Moves focus into the ruling dialog, and puts it on Overrule specifically: a
  // wrong call is the failure that matters, so undoing one should never involve
  // hunting for a button.
  useEffect(() => {
    if (pendingBonk) overruleRef.current?.focus();
  }, [pendingBonk]);

  useEffect(() => {
    const bonker = bonkerRef.current;
    return () => bonker.dispose();
  }, []);

  // The clock is driven off a deadline rather than by decrementing, so a
  // throttled background tab cannot hand a team extra time.
  useEffect(() => {
    if (roundState !== 'live' || pendingBonk) return;

    const tick = () => {
      if (deadlineRef.current === null) return;
      const left = (deadlineRef.current - performance.now()) / 1000;
      setRemaining(left);
      if (left <= 0) setRoundState('over');
    };

    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [roundState, pendingBonk]);

  // ── Refs the speech callback reads ───────────────────────────────────────
  // The callback is created once and lives inside the recognition object, so
  // everything it needs has to be readable at call time rather than captured.
  const liveRef = useRef({
    target,
    strictness,
    lexicon,
    active: false,
    checking: false,
  });
  liveRef.current = {
    target,
    strictness,
    lexicon,
    active: roundState === 'live' && !pendingBonk,
    checking: micCheck && roundState === 'idle',
  };

  const handleWords = useCallback((incoming: string[]) => {
    const {
      target: liveTarget,
      strictness: mode,
      lexicon: lex,
      active,
      checking,
    } = liveRef.current;
    if (!active) {
      // Mic check: prove the pipeline works by echoing, never by judging.
      if (checking) {
        setMicCheckHeard((previous) => [...previous, ...incoming].slice(-8));
      }
      return;
    }

    const judged: JudgedWord[] = [];
    let firstBonk: JudgedWord | null = null;

    for (const word of incoming) {
      const ruling = judgeWord(word, liveTarget, mode, lex);
      if (ruling.exempt) continue;

      nextIdRef.current += 1;
      const entry: JudgedWord = { ...ruling, id: nextIdRef.current };
      judged.push(entry);

      // Only the first violation in a batch lands — the rest of the sentence is
      // moot once the card is forfeit.
      if (entry.verdict === 'bonk' && !firstBonk) firstBonk = entry;
    }

    if (judged.length === 0) return;
    setWords((previous) => [...previous, ...judged].slice(-60));

    if (firstBonk) {
      bonkerRef.current.bonk();
      setPendingBonk({
        ruling: firstBonk,
        target: liveTarget,
        wordId: firstBonk.id,
      });
    } else if (judged.some((word) => word.verdict === 'flag')) {
      bonkerRef.current.flag();
    }
  }, []);

  const referee = useSpeechReferee({ lang: 'en-GB', onWords: handleWords });
  const { status, start, stop } = referee;

  // In open-mic mode the round drives the microphone. In hold mode the *button*
  // drives it, and this effect must not touch it while a round is live —
  // `status` is a dependency, so reacting to "now listening" by calling `stop()`
  // would cancel the press that started it.
  useEffect(() => {
    if (status === 'unsupported') return;
    // During a mic check the test button owns the microphone.
    if (micCheck) return;

    if (micMode === 'open') {
      if (roundState === 'live' && !pendingBonk) start();
      else stop();
      return;
    }
    if (roundState !== 'live' || pendingBonk) stop();
  }, [micMode, roundState, pendingBonk, status, start, stop, micCheck]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const nextCard = useCallback(() => {
    setCardIndex((index) => index + 1);
    setCustomTarget('');
    setWords([]);
  }, []);

  const addLog = useCallback((entry: Omit<LogEntry, 'id'>) => {
    nextIdRef.current += 1;
    setLog((previous) =>
      [{ ...entry, id: nextIdRef.current }, ...previous].slice(0, 40),
    );
  }, []);

  const startRound = useCallback(() => {
    bonkerRef.current.arm();
    setWords([]);
    setMicCheck(false);
    setMicCheckHeard([]);
    setPendingBonk(null);
    setRemaining(roundLength);
    deadlineRef.current = performance.now() + roundLength * 1000;
    setRoundState('live');
  }, [roundLength]);

  const endRound = useCallback(() => {
    deadlineRef.current = null;
    setPendingBonk(null);
    setRoundState('over');
  }, []);

  const nextTeam = useCallback(() => {
    setTeam((current) => (current + 1) % TEAM_NAMES.length);
    setRoundState('idle');
    setRemaining(roundLength);
    setWords([]);
    nextCard();
  }, [nextCard, roundLength]);

  const awardCard = useCallback(() => {
    const points = POINTS[tier];
    setScores((current) =>
      current.map((score, index) => (index === team ? score + points : score)),
    );
    addLog({ target, outcome: 'won', detail: 'guessed', points, team });
    nextCard();
  }, [addLog, nextCard, target, team, tier]);

  const passCard = useCallback(() => {
    addLog({ target, outcome: 'passed', detail: 'passed', points: 0, team });
    nextCard();
  }, [addLog, nextCard, target, team]);

  /** Accept the bonk: the card is forfeit and play moves on. */
  const acceptBonk = useCallback(() => {
    if (!pendingBonk) return;
    addLog({
      target: pendingBonk.target,
      outcome: 'bonked',
      detail: `"${pendingBonk.ruling.word}" — ${explainRuling(pendingBonk.ruling)}`,
      points: 0,
      team,
      word: pendingBonk.ruling.word,
    });
    setPendingBonk(null);
    nextCard();
    // The clock stopped while the overlay was up; give that time back.
    deadlineRef.current = performance.now() + remaining * 1000;
  }, [addLog, nextCard, pendingBonk, remaining, team]);

  /** Reject the bonk: the referee was wrong, the card goes back into play. */
  const overrule = useCallback(() => {
    if (!pendingBonk) return;
    // Clear the mark on exactly the word that was called, not every occurrence
    // of it — the poet may legitimately have said it earlier in the clue.
    setWords((previous) =>
      previous.map((word) =>
        word.id === pendingBonk.wordId
          ? { ...word, verdict: 'clean', reason: undefined }
          : word,
      ),
    );
    setPendingBonk(null);
    deadlineRef.current = performance.now() + remaining * 1000;
  }, [pendingBonk, remaining]);

  const resetGame = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The save effect will overwrite it with the reset state anyway.
    }
    setScores([0, 0]);
    setLog([]);
    setWords([]);
    setTeam(0);
    setDeck(shuffled(STARTER_DECK));
    setCardIndex(0);
    setTier('easy');
    setCustomTarget('');
    setPendingBonk(null);
    setRoundState('idle');
    setRemaining(roundLength);
  }, [roundLength]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const bonks = log.filter((entry) => entry.outcome === 'bonked').length;
    const wins = log.filter((entry) => entry.outcome === 'won').length;

    const bonkCounts = new Map<string, number>();
    for (const entry of log) {
      if (entry.outcome !== 'bonked' || !entry.word) continue;
      bonkCounts.set(entry.word, (bonkCounts.get(entry.word) ?? 0) + 1);
    }
    let mostBonked: { word: string; count: number } | null = null;
    for (const [word, count] of bonkCounts) {
      if (!mostBonked || count > mostBonked.count) mostBonked = { word, count };
    }

    const teams = TEAM_NAMES.map((name, index) => ({
      name,
      bonks: log.filter(
        (entry) => entry.team === index && entry.outcome === 'bonked',
      ).length,
      wins: log.filter(
        (entry) => entry.team === index && entry.outcome === 'won',
      ).length,
    }));

    return { bonks, wins, cards: log.length, mostBonked, teams };
  }, [log]);

  const listening = status === 'listening';
  const unsupported = status === 'unsupported';
  const live = roundState === 'live';

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      {unsupported ? (
        <Panel title="WRONG BROWSER" accent="pink">
          <p className="font-mono text-sm text-white">
            This page needs the browser&apos;s built-in speech recognition,
            which today means <strong>Chrome or Edge</strong> — on Android or
            desktop. Safari and Firefox either lack it or implement too little
            of it to referee a game with.
          </p>
          <p className="mt-3 font-mono text-xs text-zinc-400">
            Everything else on the page still works, so you can read the rules
            engine&apos;s verdicts below — it just will not hear you.
          </p>
        </Panel>
      ) : null}

      {/* ── Status ─────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
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
            {status === 'denied'
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
        <div className="border-2 border-white bg-zinc-900 p-3">
          <p className="font-mono text-[10px] uppercase text-zinc-400">Clock</p>
          <p className="flex items-center gap-2 font-mono text-sm font-bold text-white">
            <Timer className="h-4 w-4" aria-hidden />
            {formatClock(remaining)}
          </p>
        </div>
      </div>

      {referee.error ? (
        <p className="border-2 border-brutalist-pink bg-zinc-900 p-3 font-mono text-xs text-brutalist-pink">
          {referee.error}
        </p>
      ) : null}

      {/* ── Scoreboard ─────────────────────────────────────────────────── */}
      <Panel title="SCORE" accent="yellow">
        <div className="grid grid-cols-2 gap-3">
          {TEAM_NAMES.map((name, index) => (
            <div
              key={name}
              className={`border-2 p-4 ${
                index === team
                  ? 'border-brutalist-yellow bg-black'
                  : 'border-zinc-600'
              }`}
            >
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase text-zinc-400">
                <Users className="h-3 w-3" aria-hidden />
                TEAM {name}
                {index === team ? ' — CLUEING' : ''}
              </p>
              <p className="font-display text-3xl font-bold text-white">
                {scores[index]}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── The card ───────────────────────────────────────────────────── */}
      <Panel title="CARD">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['easy', 'hard'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTier(option)}
              className={`border-2 px-3 py-1 font-mono text-xs uppercase transition-colors ${
                tier === option
                  ? 'border-brutalist-cyan text-brutalist-cyan'
                  : 'border-zinc-600 text-zinc-400 hover:border-white hover:text-white'
              }`}
            >
              {option} · {POINTS[option]} pt{POINTS[option] > 1 ? 's' : ''}
            </button>
          ))}
        </div>

        <p
          className="break-words font-display text-4xl font-bold uppercase text-white sm:text-6xl"
          aria-live="polite"
        >
          {target || '—'}
        </p>

        <label className="mt-5 block">
          <span className="font-mono text-[10px] uppercase text-zinc-400">
            Using your own deck? Type the answer here
          </span>
          <input
            type="text"
            value={customTarget}
            onChange={(event) => setCustomTarget(event.target.value)}
            placeholder={card[tier]}
            autoComplete="off"
            className="mt-1 w-full border-2 border-white bg-black px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-brutalist-cyan focus:outline-none"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={awardCard}
            disabled={!live}
            className="flex items-center gap-2 border-2 border-brutalist-cyan px-4 py-2 font-mono text-xs font-bold uppercase text-brutalist-cyan transition-colors hover:bg-brutalist-cyan hover:text-black disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-700 disabled:hover:bg-transparent"
          >
            <Check className="h-4 w-4" aria-hidden /> Got it
          </button>
          <button
            type="button"
            onClick={passCard}
            disabled={!live}
            className="flex items-center gap-2 border-2 border-white px-4 py-2 font-mono text-xs font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-700 disabled:hover:bg-transparent"
          >
            <SkipForward className="h-4 w-4" aria-hidden /> Pass
          </button>
        </div>
      </Panel>

      {/* ── The microphone ─────────────────────────────────────────────── */}
      <Panel title="CLUE" accent="pink">
        {roundState === 'idle' ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={startRound}
              className="w-full border-2 border-brutalist-pink bg-black px-6 py-6 font-display text-2xl font-bold uppercase text-brutalist-pink transition-colors hover:bg-brutalist-pink hover:text-black"
            >
              Start {TEAM_NAMES[team]}&apos;s round
            </button>

            {/* A permission prompt mid-round costs the team their clock, so the
                mic gets a dry run here, where time is free. Heard words echo
                back unjudged — this proves the pipeline, not the rules. */}
            {!unsupported ? (
              <div>
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setMicCheck(true);
                    start();
                  }}
                  onPointerUp={() => {
                    setMicCheck(false);
                    stop();
                  }}
                  onPointerCancel={() => {
                    setMicCheck(false);
                    stop();
                  }}
                  onLostPointerCapture={() => {
                    setMicCheck(false);
                    stop();
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== ' ' && event.key !== 'Enter') return;
                    event.preventDefault();
                    setMicCheck(true);
                    start();
                  }}
                  onKeyUp={(event) => {
                    if (event.key !== ' ' && event.key !== 'Enter') return;
                    setMicCheck(false);
                    stop();
                  }}
                  onBlur={() => {
                    setMicCheck(false);
                    stop();
                  }}
                  className={`w-full touch-none select-none border-2 px-4 py-3 font-mono text-xs font-bold uppercase transition-colors ${
                    micCheck && listening
                      ? 'border-brutalist-cyan bg-brutalist-cyan text-black'
                      : 'border-brutalist-cyan bg-black text-brutalist-cyan'
                  }`}
                >
                  {micCheck && listening
                    ? 'Say something…'
                    : 'Hold to test the mic'}
                </button>
                {micCheckHeard.length > 0 ? (
                  <p className="mt-2 font-mono text-xs text-brutalist-cyan">
                    <Check
                      className="mr-1 inline h-3 w-3 align-[-2px]"
                      aria-hidden
                    />
                    Heard you: {micCheckHeard.join(' ')}
                  </p>
                ) : status === 'denied' ? null : (
                  <p className="mt-2 font-mono text-[10px] uppercase text-zinc-500">
                    Sort the permission prompt out now, not on the clock
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {live && micMode === 'hold' ? (
          <button
            type="button"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              bonkerRef.current.arm();
              start();
            }}
            onPointerUp={stop}
            onPointerCancel={stop}
            onLostPointerCapture={stop}
            // Hold-to-talk is a pointer gesture, so keyboard users get the
            // equivalent explicitly. Key repeat is harmless — `start` is
            // idempotent.
            onKeyDown={(event) => {
              if (event.key !== ' ' && event.key !== 'Enter') return;
              event.preventDefault();
              bonkerRef.current.arm();
              start();
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') stop();
            }}
            onBlur={stop}
            className={`w-full touch-none select-none border-2 px-6 py-8 font-display text-2xl font-bold uppercase transition-colors ${
              listening
                ? 'border-brutalist-pink bg-brutalist-pink text-black'
                : 'border-brutalist-pink bg-black text-brutalist-pink'
            }`}
          >
            {listening ? 'Listening — keep talking' : 'Hold to clue'}
          </button>
        ) : null}

        {live && micMode === 'open' ? (
          <p className="border-2 border-brutalist-pink bg-black p-4 font-mono text-sm text-brutalist-pink">
            Open mic. Everything it hears is judged as the poet — including
            guessers. Hold-to-clue is the fairer mode.
          </p>
        ) : null}

        {live ? (
          <button
            type="button"
            onClick={endRound}
            className="mt-3 border-2 border-zinc-600 px-4 py-2 font-mono text-xs uppercase text-zinc-400 transition-colors hover:border-white hover:text-white"
          >
            End round early
          </button>
        ) : null}

        {roundState === 'over' ? (
          <div className="space-y-3">
            <p className="font-display text-xl font-bold uppercase text-white">
              Time. Team {TEAM_NAMES[team]} scored {scores[team]}.
            </p>
            <button
              type="button"
              onClick={nextTeam}
              className="w-full border-2 border-brutalist-cyan px-6 py-4 font-display text-lg font-bold uppercase text-brutalist-cyan transition-colors hover:bg-brutalist-cyan hover:text-black"
            >
              Pass to team {TEAM_NAMES[(team + 1) % TEAM_NAMES.length]}
            </button>
          </div>
        ) : null}

        {/* Live transcript. Judged words only — the in-flight word is shown
            separately because it has not been ruled on yet. */}
        <div className="mt-5" aria-live="polite" aria-atomic="false">
          <p className="mb-2 font-mono text-[10px] uppercase text-zinc-400">
            Heard
          </p>
          <div className="flex min-h-14 flex-wrap gap-1.5 border-2 border-zinc-700 bg-black p-3">
            {words.length === 0 ? (
              <span className="font-mono text-xs text-zinc-600">
                nothing yet
              </span>
            ) : null}
            {words.map((word) => (
              <span
                key={word.id}
                title={explainRuling(word)}
                className={`border px-1.5 py-0.5 font-mono text-xs ${VERDICT_STYLE[word.verdict]}`}
              >
                {word.word}
                {word.verdict === 'clean' ? null : (
                  <span className="ml-1 opacity-70">
                    {word.verdict === 'bonk' ? '!' : '?'}
                  </span>
                )}
              </span>
            ))}
            {referee.interim ? (
              <span className="px-1.5 py-0.5 font-mono text-xs italic text-zinc-600">
                {referee.interim}…
              </span>
            ) : null}
          </div>
          {/* Named colours would be wrong half the time — the accent tokens
              remap in sketch mode, where "pink" is red and "yellow" is green.
              The glyphs carry the meaning and the swatch colour follows. */}
          <p className="mt-2 font-mono text-[10px] text-zinc-500">
            <span className="text-brutalist-pink">!</span> bonked ·{' '}
            <span className="text-brutalist-yellow">?</span> suspected, your
            call · unmarked legal
          </p>
        </div>
      </Panel>

      {/* ── Settings ───────────────────────────────────────────────────── */}
      <Panel title="REFEREE SETTINGS">
        <fieldset>
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

        {/* In production hold-to-clue is the only mode, so there is nothing to
            choose; the picker exists for development, where open mic lets a
            transcript be driven without holding a button. */}
        <fieldset className={OPEN_MIC_AVAILABLE ? 'mt-5' : 'hidden'}>
          <legend className="mb-2 font-mono text-[10px] uppercase text-zinc-400">
            Microphone
          </legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['hold', 'Hold to clue'],
                ['open', 'Open mic'],
              ] as const
            ).map(([option, label]) => (
              <button
                key={option}
                type="button"
                onClick={() => setMicMode(option)}
                aria-pressed={micMode === option}
                className={`border-2 px-3 py-1 font-mono text-xs uppercase transition-colors ${
                  micMode === option
                    ? 'border-brutalist-cyan text-brutalist-cyan'
                    : 'border-zinc-600 text-zinc-400 hover:border-white hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 font-mono text-xs text-zinc-400">
            Holding the phone and the button is the only thing separating the
            poet&apos;s voice from six people shouting guesses. Open mic exists
            for development; it judges the whole room as the poet.
          </p>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 font-mono text-[10px] uppercase text-zinc-400">
            Round length
          </legend>
          <div className="flex flex-wrap gap-2">
            {ROUND_LENGTHS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setRoundLength(option);
                  if (roundState !== 'live') setRemaining(option);
                }}
                aria-pressed={roundLength === option}
                className={`border-2 px-3 py-1 font-mono text-xs uppercase transition-colors ${
                  roundLength === option
                    ? 'border-brutalist-cyan text-brutalist-cyan'
                    : 'border-zinc-600 text-zinc-400 hover:border-white hover:text-white'
                }`}
              >
                {option}s
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={resetGame}
          className="mt-6 flex items-center gap-2 border-2 border-zinc-600 px-3 py-1.5 font-mono text-xs uppercase text-zinc-400 transition-colors hover:border-brutalist-pink hover:text-brutalist-pink"
        >
          <RotateCcw className="h-3 w-3" aria-hidden /> Reset game
        </button>
      </Panel>

      {/* ── Log ────────────────────────────────────────────────────────── */}
      {log.length > 0 ? (
        <Panel title="RULING LOG">
          <p className="mb-3 font-mono text-xs text-zinc-400">
            {stats.cards} cards · {stats.wins} guessed · {stats.bonks} bonked
          </p>
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {stats.teams.map((teamStats) => (
              <p
                key={teamStats.name}
                className="border-l-2 border-zinc-700 pl-3 font-mono text-xs text-zinc-400"
              >
                <span className="text-white">TEAM {teamStats.name}</span> ·{' '}
                {teamStats.wins} guessed ·{' '}
                <span
                  className={
                    teamStats.bonks > 0 ? 'text-brutalist-pink' : undefined
                  }
                >
                  {teamStats.bonks} bonked
                </span>
              </p>
            ))}
          </div>
          {stats.mostBonked ? (
            <p className="mb-3 font-mono text-xs text-zinc-400">
              Most bonked:{' '}
              <span className="uppercase text-brutalist-pink">
                {stats.mostBonked.word}
              </span>
              {stats.mostBonked.count > 1 ? ` × ${stats.mostBonked.count}` : ''}
            </p>
          ) : null}
          <ol className="space-y-1.5">
            {log.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-2 border-l-2 border-zinc-700 pl-3 font-mono text-xs"
              >
                <span className="uppercase text-white">{entry.target}</span>
                <span
                  className={
                    entry.outcome === 'bonked'
                      ? 'text-brutalist-pink'
                      : entry.outcome === 'won'
                        ? 'text-brutalist-cyan'
                        : 'text-zinc-500'
                  }
                >
                  {entry.detail}
                </span>
                <span className="text-zinc-500">
                  {entry.points > 0 ? `+${entry.points}` : '0'} ·{' '}
                  {TEAM_NAMES[entry.team]}
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      {/* ── Caveats ────────────────────────────────────────────────────── */}
      <Panel title="WHAT THIS CANNOT DO" accent="yellow">
        {/* Flex rather than an inline glyph plus a text node: JSX collapses
            leading whitespace inconsistently depending on where the formatter
            breaks the line, which showed up as a missing space after some of
            the prompts and not others. */}
        <ul className="space-y-2 font-mono text-xs text-zinc-400">
          {CAVEATS.map((caveat) => (
            <li key={caveat.slice(0, 24)} className="flex gap-2">
              <span aria-hidden className="text-brutalist-yellow">
                &gt;
              </span>
              <span>{caveat}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* ── Bonk ───────────────────────────────────────────────────────── */}
      {pendingBonk ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="neanderbonk-verdict"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <div className="w-full max-w-lg border-4 border-brutalist-pink bg-black p-6 text-center">
            <Gavel
              className="mx-auto mb-4 h-14 w-14 text-brutalist-pink motion-safe:animate-pulse"
              aria-hidden
            />
            <h2
              id="neanderbonk-verdict"
              className="font-display text-5xl font-bold uppercase text-brutalist-pink sm:text-7xl"
            >
              Bonk
            </h2>
            <p className="mt-4 break-words font-display text-2xl font-bold uppercase text-white">
              &ldquo;{pendingBonk.ruling.word}&rdquo;
            </p>
            <p className="mt-1 font-mono text-sm text-zinc-400">
              {explainRuling(pendingBonk.ruling)}
            </p>
            <p className="mt-4 font-mono text-xs text-zinc-500">
              Card forfeit. Someone pick up the club.
            </p>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={acceptBonk}
                className="flex-1 border-2 border-brutalist-pink bg-brutalist-pink px-4 py-3 font-display text-base font-bold uppercase text-black"
              >
                Fair — next card
              </button>
              <button
                type="button"
                ref={overruleRef}
                onClick={overrule}
                className="flex flex-1 items-center justify-center gap-2 border-2 border-white px-4 py-3 font-display text-base font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
              >
                <Undo2 className="h-4 w-4" aria-hidden /> Overrule
              </button>
            </div>
            <p className="mt-3 flex items-center justify-center gap-2 font-mono text-[10px] uppercase text-zinc-500">
              <TriangleAlert className="h-3 w-3" aria-hidden />
              The table has the final say, not the phone
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
