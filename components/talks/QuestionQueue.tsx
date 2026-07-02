import { useMutation, useQuery } from 'convex/react';
import { useCallback, useState } from 'react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { getMachineId } from '@/lib/machineId';
import { useDeckMode } from './DeckModeContext';
import { ResolvedRoom } from './ResolvedRoom';

const VOTED_KEY = 'talk-qa-voted';

/** Ids this browser has already upvoted (kept client-side to disable re-voting). */
function useVoted() {
  const [voted, setVoted] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(VOTED_KEY) ?? '[]'));
    } catch {
      return new Set();
    }
  });
  const mark = useCallback((id: string) => {
    setVoted((prev) => {
      const next = new Set(prev).add(id);
      try {
        localStorage.setItem(VOTED_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);
  return { voted, mark };
}

function Queue({
  room,
  display,
  title,
  info,
  placeholder,
}: {
  room: string;
  display?: boolean;
  title?: string;
  info?: string;
  placeholder?: string;
}) {
  const mode = useDeckMode();
  const data = useQuery(api.questions.list, { room });
  const ask = useMutation(api.questions.ask);
  const upvote = useMutation(api.questions.upvote);
  const { voted, mark } = useVoted();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Projected/console decks (and any `display` embed) are read-only: no ask box,
  // votes shown as static badges. Students ask + upvote from /live.
  const readOnly = display || mode !== 'attendee';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await ask({ room, text: trimmed });
      setText('');
    } finally {
      setSending(false);
    }
  };

  const questions = data?.questions ?? [];
  const blocked = data?.blocked ?? 0;

  return (
    <div className="border-2 border-white bg-zinc-900 p-5">
      <p className="mb-1 font-mono text-sm uppercase text-brutalist-cyan">
        {title ?? (readOnly ? 'Top questions' : 'Ask a question')}
      </p>
      {info && <p className="mb-3 font-mono text-xs text-zinc-500">{info}</p>}
      {!info && <div className="mb-2" />}

      {!readOnly && (
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
            placeholder={placeholder ?? 'Type your question…'}
            className="min-w-0 flex-1 border-2 border-white bg-black px-3 py-3 font-mono text-base text-white placeholder:text-zinc-600 focus:border-brutalist-cyan focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="border-2 border-white bg-brutalist-cyan px-5 py-3 font-mono font-bold uppercase text-black shadow-hard-md disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      )}

      <div className={`${readOnly ? '' : 'mt-5'} space-y-2`}>
        {questions.length === 0 ? (
          <p className="font-mono text-sm text-zinc-500">
            {readOnly
              ? 'Questions from the room will appear here.'
              : 'No questions yet — be the first. Upvote others to push them up.'}
          </p>
        ) : (
          questions.map((q) => {
            const hasVoted = voted.has(q._id);
            return (
              <div
                key={q._id}
                className={`flex items-center gap-3 border-2 p-3 ${
                  q.answered
                    ? 'border-zinc-700 bg-black/40 opacity-60'
                    : 'border-white bg-black'
                }`}
              >
                {readOnly ? (
                  <div className="flex w-12 shrink-0 flex-col items-center border-2 border-brutalist-yellow py-1 font-mono font-bold text-brutalist-yellow">
                    <span className="text-sm leading-none">▲</span>
                    <span className="text-lg leading-tight">{q.votes}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={hasVoted || q.answered}
                    onClick={() => {
                      // Only mark as voted once the mutation confirms the vote
                      // counted — a failed or no-op upvote leaves the button live.
                      upvote({
                        id: q._id as Id<'questions'>,
                        machineId: getMachineId(),
                      })
                        .then((ok) => {
                          if (ok) mark(q._id);
                        })
                        .catch(() => {});
                    }}
                    className={`flex w-12 shrink-0 flex-col items-center border-2 py-1 font-mono font-bold ${
                      hasVoted
                        ? 'border-brutalist-yellow bg-brutalist-yellow text-black'
                        : 'border-white text-white hover:bg-white hover:text-black'
                    } disabled:cursor-default`}
                    aria-label="Upvote question"
                  >
                    <span className="text-sm leading-none">▲</span>
                    <span className="text-lg leading-tight">{q.votes}</span>
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-base text-white">{q.text}</p>
                  {q.nickname && (
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      — {q.nickname}
                    </p>
                  )}
                  {q.answered && (
                    <p className="mt-1 font-mono text-xs uppercase text-brutalist-cyan">
                      ✓ answered
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        {blocked > 0 && (
          <p className="pt-1 font-mono text-xs text-zinc-600">
            🚫 {blocked} {blocked === 1 ? 'entry' : 'entries'} blocked
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Embedded live Q&A: anyone types a question, everyone upvotes to reorder the
 * queue, the presenter answers/rejects from the console. Rejected questions show
 * only as a "blocked" count. Resolves the live room automatically, or takes one.
 * `display` (projected deck) is read-only — no ask box, votes as static badges.
 */
export default function QuestionQueue({
  room,
  display,
  title,
  info,
  placeholder,
}: {
  room?: string;
  display?: boolean;
  title?: string;
  info?: string;
  placeholder?: string;
}) {
  return (
    <ResolvedRoom room={room}>
      {(r) => (
        <Queue
          room={r}
          display={display}
          title={title}
          info={info}
          placeholder={placeholder}
        />
      )}
    </ResolvedRoom>
  );
}
