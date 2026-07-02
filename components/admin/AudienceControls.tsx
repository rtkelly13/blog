import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useRunAction } from './useRunAction';

/** Shared error line for the admin panels. */
function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="font-mono text-xs text-brutalist-pink">{error}</p>;
}

const REVEAL_PRESETS = [
  { label: '30s', ms: 30_000 },
  { label: '1 min', ms: 60_000 },
  { label: '2 min', ms: 120_000 },
  { label: '5 min', ms: 300_000 },
];

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-2 border-white bg-black p-4">
      <p
        className={`mb-3 font-mono text-xs uppercase tracking-wider ${accent}`}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

const inputCls =
  'w-full border-2 border-white bg-black px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:outline-none';
const btnCls =
  'border-2 border-white px-3 py-2 font-mono text-xs font-bold uppercase shadow-hard-md disabled:opacity-40';

/* ------------------------------- Poll ---------------------------------- */
function PollControls({ room }: { room: string }) {
  const poll = useQuery(api.polls.active, { room });
  const feed = useQuery(api.polls.feed, poll ? { pollId: poll._id } : 'skip');
  const start = useMutation(api.polls.start);
  const close = useMutation(api.polls.close);
  const hideWord = useMutation(api.polls.hideWord);
  const { run, error } = useRunAction();
  const [prompt, setPrompt] = useState('');
  // Answers each attendee may submit (server-clamped 1–5; default 1).
  const [maxAnswers, setMaxAnswers] = useState(1);

  return (
    <Section title="Live poll / word cloud" accent="text-brutalist-pink">
      {poll ? (
        <div className="space-y-3">
          <p className="font-mono text-sm text-white">
            Open: <b>{poll.prompt}</b>{' '}
            <span className="text-zinc-500">
              ({poll.maxAnswers} answer{poll.maxAnswers === 1 ? '' : 's'} per
              person)
            </span>
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {feed?.authorized &&
              feed.words.map((w) => (
                <div
                  key={w._id}
                  className={`flex items-center justify-between gap-2 border-2 px-2 py-1 font-mono text-sm ${
                    w.hidden
                      ? 'border-zinc-700 text-zinc-600 line-through'
                      : 'border-zinc-700 text-white'
                  }`}
                >
                  <span className="truncate">
                    {w.word} <span className="text-zinc-500">×{w.count}</span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-xs uppercase text-brutalist-pink underline"
                    onClick={() =>
                      run(() =>
                        hideWord({
                          id: w._id as Id<'pollWords'>,
                          hidden: !w.hidden,
                        }),
                      )
                    }
                  >
                    {w.hidden ? 'unblock' : 'block'}
                  </button>
                </div>
              ))}
          </div>
          <button
            type="button"
            className={`${btnCls} bg-black text-brutalist-pink`}
            onClick={() => run(() => close({ id: poll._id as Id<'polls'> }))}
          >
            Close poll
          </button>
          <ErrorLine error={error} />
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!prompt.trim()) return;
            run(() =>
              start({
                room,
                prompt: prompt.trim(),
                maxAnswersPerAttendee: maxAnswers,
              }),
            );
            setPrompt('');
            setMaxAnswers(1);
          }}
        >
          <input
            className={inputCls}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Poll prompt, e.g. One word: how do you feel about coding?"
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase text-zinc-500">
              Answers per person
            </span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxAnswers(n)}
                className={`border-2 px-2 py-1 font-mono text-xs ${
                  maxAnswers === n
                    ? 'border-brutalist-pink bg-brutalist-pink text-black'
                    : 'border-white text-white'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="submit"
              disabled={!prompt.trim()}
              className={`${btnCls} ml-auto bg-brutalist-pink text-black`}
            >
              Start
            </button>
          </div>
          <ErrorLine error={error} />
        </form>
      )}
    </Section>
  );
}

/* ---------------------------- Ordered actions -------------------------- */
function ActivityControls({ room }: { room: string }) {
  const feed = useQuery(api.activities.feed, { room });
  const open = useMutation(api.activities.open);
  const close = useMutation(api.activities.close);
  const revealNow = useMutation(api.activities.revealNow);
  const setHidden = useMutation(api.activities.setHidden);
  const { run, error } = useRunAction();

  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState('');
  const [delayMs, setDelayMs] = useState(120_000);

  const activity = feed?.authorized ? feed.activity : null;

  return (
    <Section title="Put-it-in-order activity" accent="text-brutalist-yellow">
      {activity ? (
        <div className="space-y-3">
          <p className="font-mono text-sm text-white">
            Open: <b>{activity.prompt}</b>{' '}
            <span className="text-zinc-500">
              ({activity.revealed ? 'answer revealed' : 'answer hidden'})
            </span>
          </p>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {feed?.authorized &&
              feed.submissions.map((s) => (
                <div
                  key={s._id}
                  className={`border-2 p-2 font-mono text-xs ${
                    s.hidden
                      ? 'border-zinc-800 text-zinc-600'
                      : 'border-zinc-700 text-zinc-200'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-brutalist-pink">
                      {s.nickname ?? 'anon'}
                    </span>
                    <button
                      type="button"
                      className="text-xs uppercase text-brutalist-pink underline"
                      onClick={() =>
                        run(() =>
                          setHidden({
                            id: s._id as Id<'activitySubmissions'>,
                            hidden: !s.hidden,
                          }),
                        )
                      }
                    >
                      {s.hidden ? 'restore' : 'reject'}
                    </button>
                  </div>
                  <span className={s.hidden ? 'line-through' : ''}>
                    {s.steps.join(' → ')}
                  </span>
                </div>
              ))}
          </div>
          <div className="flex gap-2">
            {!activity.revealed && (
              <button
                type="button"
                className={`${btnCls} bg-brutalist-cyan text-black`}
                onClick={() =>
                  run(() => revealNow({ id: activity._id as Id<'activities'> }))
                }
              >
                Reveal answer now
              </button>
            )}
            <button
              type="button"
              className={`${btnCls} bg-black text-brutalist-yellow`}
              onClick={() =>
                run(() => close({ id: activity._id as Id<'activities'> }))
              }
            >
              Close activity
            </button>
          </div>
          <ErrorLine error={error} />
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!prompt.trim()) return;
            const opts = options
              .split('\n')
              .map((o) => o.trim())
              .filter(Boolean);
            run(() =>
              open({
                room,
                prompt: prompt.trim(),
                options: opts,
                revealDelayMs: delayMs,
              }),
            );
            setPrompt('');
            setOptions('');
          }}
        >
          <input
            className={inputCls}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt, e.g. Put the steps to make toast in order"
          />
          <textarea
            className={`${inputCls} h-24 resize-none`}
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder={'Answer steps (one per line) — revealed on the timer'}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs uppercase text-zinc-500">
              Reveal after
            </span>
            {REVEAL_PRESETS.map((p) => (
              <button
                key={p.ms}
                type="button"
                onClick={() => setDelayMs(p.ms)}
                className={`border-2 px-2 py-1 font-mono text-xs ${
                  delayMs === p.ms
                    ? 'border-brutalist-yellow bg-brutalist-yellow text-black'
                    : 'border-white text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="submit"
              disabled={!prompt.trim()}
              className={`${btnCls} ml-auto bg-brutalist-yellow text-black`}
            >
              Open activity
            </button>
          </div>
          <ErrorLine error={error} />
        </form>
      )}
    </Section>
  );
}

/* -------------------------------- Q&A ---------------------------------- */
function QAControls({ room }: { room: string }) {
  const feed = useQuery(api.questions.feed, { room });
  const setAnswered = useMutation(api.questions.setAnswered);
  const setHidden = useMutation(api.questions.setHidden);
  const { run, error } = useRunAction();

  if (!feed?.authorized) return null;

  return (
    <Section title="Q&A moderation" accent="text-brutalist-cyan">
      {feed.questions.length === 0 ? (
        <p className="font-mono text-sm text-zinc-500">No questions yet.</p>
      ) : (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {feed.questions.map((q) => (
            <div
              key={q._id}
              className={`flex items-start gap-2 border-2 p-2 font-mono text-sm ${
                q.hidden
                  ? 'border-zinc-800 text-zinc-600'
                  : 'border-zinc-700 text-white'
              }`}
            >
              <span className="w-8 shrink-0 text-center font-bold text-brutalist-yellow">
                {q.votes}
              </span>
              <span
                className={`min-w-0 flex-1 ${q.hidden ? 'line-through' : ''}`}
              >
                {q.text}
                {q.nickname && (
                  <span className="text-zinc-500"> — {q.nickname}</span>
                )}
              </span>
              <div className="flex shrink-0 flex-col gap-1 text-xs uppercase">
                <button
                  type="button"
                  className="text-brutalist-cyan underline"
                  onClick={() =>
                    run(() =>
                      setAnswered({
                        id: q._id as Id<'questions'>,
                        answered: !q.answered,
                      }),
                    )
                  }
                >
                  {q.answered ? 'unmark' : 'answered'}
                </button>
                <button
                  type="button"
                  className="text-brutalist-pink underline"
                  onClick={() =>
                    run(() =>
                      setHidden({
                        id: q._id as Id<'questions'>,
                        hidden: !q.hidden,
                      }),
                    )
                  }
                >
                  {q.hidden ? 'restore' : 'reject'}
                </button>
              </div>
            </div>
          ))}
          <ErrorLine error={error} />
        </div>
      )}
    </Section>
  );
}

/**
 * Presenter cockpit for the audience-participation features: start/close a poll,
 * open a put-it-in-order activity (with a timed answer reveal), moderate the Q&A
 * queue, and reject individual entries — rejected content never reaches the
 * audience, which sees only a blocked count.
 */
export default function AudienceControls({ room }: { room: string }) {
  return (
    <div className="space-y-4">
      <PollControls room={room} />
      <ActivityControls room={room} />
      <QAControls room={room} />
    </div>
  );
}
