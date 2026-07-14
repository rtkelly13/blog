import { useMutation, useQuery } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import ActivityEvalGrid from '@/components/admin/ActivityEvalGrid';
import ErrorLine from '@/components/admin/ErrorLine';
import { useRunAction } from '@/components/admin/useRunAction';
import PresenceBadge from '@/components/PresenceBadge';
import Reactions from '@/components/Reactions';
import TalkStatsChart from '@/components/TalkStatsChart';
import { api } from '@/convex/_generated/api';
import type { SlideWindow } from '@/lib/slideTiming';
import { BreakControl } from './BreakTimer';
import QuestionQueue from './QuestionQueue';
import SlideBody from './SlideBody';
import TalkTimer from './TalkTimer';

type Slide = {
  code: string;
  notes: string | null;
  /** `[⏱ a–b …]` window from the notes — drives the pacing indicator. */
  window?: SlideWindow | null;
};

// Right-hand deck sidebar. The floating reaction bubbles (from <Reactions>) rise
// in the viewport's right 20vw, i.e. within/near this panel.
const PANEL =
  'flex h-full w-full flex-col gap-4 overflow-y-auto border-l-2 border-white bg-zinc-950 p-4';

/** Attendee (watch-along) sidebar: react + see everyone's synced reactions. */
export function AttendeeSidebar({ room }: { room: string }) {
  return (
    <aside className={PANEL}>
      <p className="font-mono text-xs uppercase tracking-wider text-brutalist-cyan">
        React
      </p>
      <Reactions room={room} />
      <p className="mt-auto font-mono text-[10px] uppercase leading-relaxed text-zinc-600">
        Tap to react — everyone's reactions float up here.
      </p>
    </aside>
  );
}

/**
 * Console Q&A panel: always-visible live queue (audience-visible questions,
 * votes-first via `questions.list`) with a toast-style "+N new" ping when a
 * question arrives. Last-seen is tracked client-side per mount, seeded with
 * whatever is already in the queue so opening the console doesn't ping.
 */
function ConsoleQuestionsPanel({ room }: { room: string }) {
  const data = useQuery(api.questions.list, { room });
  const questions = data?.questions;

  const seenRef = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState(0);

  useEffect(() => {
    if (!questions) return;
    if (seenRef.current === null) {
      seenRef.current = new Set(questions.map((q) => q._id));
      return;
    }
    const seen = seenRef.current;
    const arrived = questions.filter((q) => !seen.has(q._id));
    if (arrived.length === 0) return;
    for (const q of arrived) seen.add(q._id);
    setFresh((n) => n + arrived.length);
  }, [questions]);

  // The ping is a transient flash, not a persistent unread count — the queue
  // itself is always on screen, so clear the badge after a few seconds.
  useEffect(() => {
    if (fresh === 0) return;
    const t = setTimeout(() => setFresh(0), 6000);
    return () => clearTimeout(t);
  }, [fresh]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase text-zinc-400">
          Questions{' '}
          <span className="text-white">
            {questions ? questions.length : '…'}
          </span>
        </p>
        {fresh > 0 && (
          <span className="animate-pulse border-2 border-brutalist-yellow bg-brutalist-yellow px-2 py-0.5 font-mono text-xs font-bold uppercase text-black">
            +{fresh} new
          </span>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        <QuestionQueue room={room} display title="Live queue" />
      </div>
    </div>
  );
}

/**
 * Projected-deck Q&A sidebar: the presenter toggles this on to show the room
 * the question queue. Display-only and audience-safe — it renders the same
 * non-hidden, votes-ordered list the audience sees on /live.
 */
export function PresenterQuestionsSidebar({ room }: { room: string }) {
  return (
    <aside className={PANEL}>
      <QuestionQueue
        room={room}
        display
        title="Questions from the room"
        info="Ask + upvote from the live link — top-voted first."
      />
    </aside>
  );
}

/** Scaled-down live render of a slide for the "next up" preview. */
function Thumb({ code }: { code: string }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        border: '2px solid #3f3f46',
        background: '#000',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '320%',
          transform: 'scale(0.3125)',
          transformOrigin: 'top left',
          padding: '1.5rem',
          pointerEvents: 'none',
        }}
      >
        <SlideBody code={code} />
      </div>
    </div>
  );
}

/**
 * Presenter console (admin second screen): drive the deck (Prev/Next → setSlide,
 * same identity as the presenter), read speaker notes for the current slide,
 * preview what's next, and monitor the Q&A queue (with a new-question ping),
 * connection status, reactions and live numbers.
 */
export function ConsoleSidebar({
  room,
  slides,
  currentSlide,
  onPrev,
  onNext,
  startedAt,
  durationMins,
}: {
  room: string;
  slides: Slide[];
  currentSlide: number;
  onPrev: () => void;
  onNext: () => void;
  startedAt?: number;
  durationMins?: number;
}) {
  const presenters = useQuery(api.talks.presenterCount, { room });
  // Presenter-only feed of the open ordered-actions activity (null when none),
  // so submissions can be evaluated from the console without leaving the deck.
  const activityFeed = useQuery(api.activities.feed, { room });
  const end = useMutation(api.talks.end);
  const { run: runEnd, error: endError } = useRunAction();

  const last = slides.length - 1;
  const idx = Math.min(Math.max(currentSlide, 0), Math.max(last, 0));
  const notes = slides[idx]?.notes;
  const next = slides[idx + 1];

  const clash = typeof presenters === 'number' && presenters > 1;
  const noPresenter = presenters === 0;

  const btn =
    'flex-1 border-2 border-white px-3 py-2 font-mono text-sm font-bold uppercase text-black shadow-hard-md disabled:opacity-40 disabled:shadow-none';

  return (
    <aside className={PANEL}>
      <p className="font-mono text-xs uppercase tracking-wider text-brutalist-pink">
        Console
      </p>

      {/* Pacing timer (keyed on startedAt so a new talk resets it) — with the
          current slide's ⏱ window (when its notes declare one) for the
          on-track / ahead / behind indicator. */}
      {startedAt != null && (
        <TalkTimer
          key={startedAt}
          startedAt={startedAt}
          durationMins={durationMins}
          slideWindow={slides[idx]?.window ?? null}
        />
      )}

      {/* Break countdown: start/extend/end — mirrored big on the break slide
          and on every attendee's /live page (shared server-side end time). */}
      <BreakControl room={room} />

      {/* Drive the deck */}
      <div className="space-y-2">
        <p className="font-mono text-xs uppercase text-zinc-400">
          Slide{' '}
          <span className="text-white">
            {idx + 1} / {slides.length}
          </span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={idx <= 0}
            className={`${btn} bg-white`}
          >
            ◀ Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={idx >= last}
            className={`${btn} bg-brutalist-cyan`}
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* Speaker notes (from the slide's `???` block in the MDX) */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase text-zinc-400">Notes</p>
        <div className="max-h-56 overflow-y-auto whitespace-pre-wrap border-2 border-zinc-700 bg-black p-3 font-mono text-sm leading-relaxed text-zinc-200">
          {notes || (
            <span className="text-zinc-600">
              No notes for this slide. Add a <code>???</code> block after the
              slide body in the MDX.
            </span>
          )}
        </div>
      </div>

      {/* Next-slide preview */}
      {next && (
        <div>
          <p className="mb-2 font-mono text-xs uppercase text-zinc-400">
            Next up
          </p>
          <Thumb code={next.code} />
        </div>
      )}

      {/* Open ordered-actions activity: evaluate submissions in-context
          (mark the one being discussed, hide/restore) without leaving the deck. */}
      {activityFeed?.authorized && activityFeed.activity && (
        <div>
          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-brutalist-yellow">
            Activity · {activityFeed.submissions.length}{' '}
            {activityFeed.submissions.length === 1
              ? 'submission'
              : 'submissions'}
          </p>
          <p className="mb-2 font-mono text-xs text-zinc-400">
            {activityFeed.activity.prompt}
          </p>
          <div className="max-h-80 overflow-y-auto pr-1">
            <ActivityEvalGrid submissions={activityFeed.submissions} />
          </div>
        </div>
      )}

      {/* Q&A queue (always visible — new arrivals ping) */}
      <ConsoleQuestionsPanel room={room} />

      {/* Connection status */}
      <div className="space-y-1 border-2 border-zinc-700 p-3 font-mono text-xs">
        <p className="uppercase tracking-wider text-zinc-500">Status</p>
        <p
          className={
            clash
              ? 'text-brutalist-pink'
              : noPresenter
                ? 'text-brutalist-yellow'
                : 'text-brutalist-cyan'
          }
        >
          {presenters === undefined
            ? 'presenter link: …'
            : clash
              ? `⚠ ${presenters} presenters connected — last change wins`
              : noPresenter
                ? 'no presenter broadcasting'
                : 'presenter connected'}
        </p>
        <PresenceBadge room={room} />
      </div>

      {/* Monitoring */}
      <div>
        <p className="mb-2 font-mono text-xs uppercase text-zinc-400">
          Reactions
        </p>
        <Reactions room={room} />
      </div>

      <div>
        <p className="mb-2 font-mono text-xs uppercase text-zinc-400">
          Live numbers
        </p>
        <TalkStatsChart room={room} threshold={0} />
      </div>

      <div className="mt-auto space-y-2">
        <button
          type="button"
          onClick={() => runEnd(() => end({}))}
          className="w-full border-2 border-white bg-brutalist-pink px-4 py-2 font-mono text-sm font-bold uppercase text-black shadow-hard-md"
        >
          End talk
        </button>
        <ErrorLine error={endError} />
      </div>
    </aside>
  );
}
