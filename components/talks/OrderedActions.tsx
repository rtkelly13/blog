import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';
import { useDeckMode } from './DeckModeContext';

/** Live-updating seconds remaining until `revealAt` (null once elapsed/absent). */
function useCountdown(revealAt: number | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!revealAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [revealAt]);
  if (!revealAt) return null;
  const secs = Math.ceil((revealAt - now) / 1000);
  return secs > 0 ? secs : null;
}

/** One submission on the wall. Blocked rows (console only) are greyed + tagged. */
function SubmissionCard({
  nickname,
  steps,
  hidden,
}: {
  nickname?: string;
  steps: string[];
  hidden?: boolean;
}) {
  return (
    <div
      className={`border-2 p-3 ${
        hidden ? 'border-zinc-800 opacity-50' : 'border-zinc-700'
      } bg-black`}
    >
      <div className="mb-1 flex items-center justify-between">
        {nickname ? (
          <p className="font-mono text-xs text-brutalist-pink">{nickname}</p>
        ) : (
          <span />
        )}
        {hidden && (
          <span className="font-mono text-xs uppercase text-zinc-500">
            🚫 blocked
          </span>
        )}
      </div>
      <ol className="space-y-0.5">
        {steps.map((step, i) => (
          <li key={i} className="font-mono text-xs text-zinc-300">
            {i + 1}. {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Activity({
  room,
  display,
  title,
  info,
  prompt,
  options: defaultOptions,
  revealAfterMs,
}: {
  room: string;
  display?: boolean;
  title?: string;
  info?: string;
  prompt?: string;
  options?: string[];
  revealAfterMs?: number;
}) {
  const mode = useDeckMode();
  const isConsole = mode === 'console';

  // Console (presenter 2nd screen) reads the admin feed — the answer and every
  // submission (including blocked ones) are ALWAYS visible for moderation. Every
  // other surface reads the reveal-gated audience view.
  const active = useQuery(api.activities.active, isConsole ? 'skip' : { room });
  const feedRes = useQuery(api.activities.feed, isConsole ? { room } : 'skip');
  const submit = useMutation(api.activities.submit);
  const openActivity = useMutation(api.activities.open);
  const isAdmin = useQuery(api.talks.isAdmin) === true;

  const [steps, setSteps] = useState<string[]>(['']);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const consoleActivity = feedRes?.authorized ? feedRes.activity : null;
  const activity = isConsole ? consoleActivity : (active ?? null);

  const countdown = useCountdown(
    activity && !activity.revealed ? activity.revealAt : null,
  );

  // No open activity yet. An admin on a slide that declares a prompt + default
  // answer can launch it in one click (config lives with the slide, not /admin).
  if (!activity) {
    const canLaunch = isAdmin && !!prompt && (defaultOptions?.length ?? 0) > 0;
    if (!canLaunch) return null;
    return (
      <div className="border-2 border-dashed border-brutalist-yellow bg-zinc-900 p-5">
        <p className="mb-1 font-mono text-sm uppercase text-brutalist-yellow">
          ● {title ?? 'Put it in order'}
        </p>
        <p className="mb-3 font-mono text-sm text-zinc-300">{prompt}</p>
        <button
          type="button"
          onClick={() =>
            openActivity({
              room,
              prompt: prompt as string,
              options: defaultOptions as string[],
              revealDelayMs: revealAfterMs,
            }).catch(() => {})
          }
          className="border-2 border-white bg-brutalist-yellow px-5 py-2 font-mono font-bold uppercase text-black shadow-hard-md"
        >
          ▶ Open activity
        </button>
      </div>
    );
  }

  // Console always sees the answer; audience/presenter only once revealed. Keep
  // the two submission shapes as separate typed lists (console rows carry a
  // `hidden` flag; audience rows don't) so the wall render stays type-clean.
  const options = isConsole
    ? (consoleActivity?.options ?? [])
    : (active?.options ?? []);
  const consoleSubs = isConsole ? (feedRes?.submissions ?? []) : [];
  const audienceWall = isConsole ? [] : (active?.wall ?? []);
  const blocked = isConsole
    ? consoleSubs.filter((s) => s.hidden).length
    : (active?.blocked ?? 0);
  const submissionCount = isConsole ? consoleSubs.length : audienceWall.length;
  const showForm = !display && mode === 'attendee';
  const answerVisible = options.length > 0 && (isConsole || activity.revealed);

  const setStep = (i: number, val: string) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? val : s)));
  const addStep = () =>
    setSteps((prev) => (prev.length >= 12 ? prev : [...prev, '']));
  const removeStep = (i: number) =>
    setSteps((prev) =>
      prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i),
    );

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = steps.map((s) => s.trim()).filter(Boolean);
    if (filled.length === 0 || sending) return;
    setSending(true);
    try {
      await submit({ activityId: activity._id, steps: filled });
      setSteps(['']);
      setSubmitted(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-2 border-white bg-zinc-900 p-5">
      <p className="mb-1 font-mono text-sm uppercase text-brutalist-yellow">
        ● {title ?? 'Put it in order'}
      </p>
      <h3 className="mb-1 font-display text-2xl font-bold uppercase text-white">
        {activity.prompt}
      </h3>
      {info && <p className="mb-4 font-mono text-xs text-zinc-500">{info}</p>}
      {!info && <div className="mb-3" />}

      {showForm &&
        (submitted ? (
          <p className="border-2 border-brutalist-cyan bg-black p-3 font-mono text-sm text-brutalist-cyan">
            ✓ Submitted! Watch the wall below.{' '}
            <button
              type="button"
              className="underline"
              onClick={() => setSubmitted(false)}
            >
              Add another
            </button>
          </p>
        ) : (
          <form onSubmit={send} className="space-y-2">
            {/* Rows are positional (order is the point) so index keys are fine. */}
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-center font-mono font-bold text-zinc-500">
                  {i + 1}
                </span>
                <input
                  value={step}
                  onChange={(e) => setStep(i, e.target.value)}
                  maxLength={140}
                  placeholder={`Step ${i + 1}…`}
                  className="min-w-0 flex-1 border-2 border-white bg-black px-3 py-2.5 font-mono text-base text-white placeholder:text-zinc-600 focus:border-brutalist-yellow focus:outline-none"
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="w-9 shrink-0 border-2 border-white py-2 font-mono font-bold text-white hover:bg-brutalist-pink hover:text-black"
                    aria-label="Remove step"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              <button
                type="button"
                onClick={addStep}
                disabled={steps.length >= 12}
                className="border-2 border-white bg-black px-4 py-2.5 font-mono font-bold uppercase text-white hover:bg-white hover:text-black disabled:opacity-40"
              >
                + Add step
              </button>
              <button
                type="submit"
                disabled={sending || !steps.some((s) => s.trim())}
                className="border-2 border-white bg-brutalist-yellow px-5 py-2.5 font-mono font-bold uppercase text-black shadow-hard-md disabled:opacity-40 sm:ml-auto"
              >
                Submit my order
              </button>
            </div>
          </form>
        ))}

      {/* Answer: always shown on the console (with room-reveal status), otherwise
          only once revealed. A countdown runs while the room can't see it yet. */}
      {answerVisible && (
        <div className="mt-5 border-2 border-brutalist-cyan bg-black p-4">
          <p className="mb-2 font-mono text-xs uppercase text-brutalist-cyan">
            One good order
            {isConsole &&
              (activity.revealed
                ? ' · shown to room'
                : countdown != null
                  ? ` · room sees it in ${countdown}s`
                  : ' · hidden from room')}
          </p>
          <ol className="space-y-1">
            {options.map((opt, i) => (
              <li key={opt} className="font-mono text-sm text-white">
                <span className="text-brutalist-cyan">{i + 1}.</span> {opt}
              </li>
            ))}
          </ol>
        </div>
      )}
      {!isConsole && !activity.revealed && countdown != null && (
        <p className="mt-4 font-mono text-xs uppercase text-zinc-500">
          Answer reveals in {countdown}s…
        </p>
      )}

      {/* Live wall of submissions. On the console, blocked entries stay visible
          (greyed, tagged) so the presenter sees exactly what was moderated. */}
      <div className="mt-5">
        <p className="mb-2 font-mono text-xs uppercase text-zinc-400">
          The room ({submissionCount})
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {isConsole
            ? consoleSubs.map((s) => (
                <SubmissionCard
                  key={s._id}
                  nickname={s.nickname}
                  steps={s.steps}
                  hidden={s.hidden}
                />
              ))
            : audienceWall.map((s) => (
                <SubmissionCard
                  key={s._id}
                  nickname={s.nickname}
                  steps={s.steps}
                />
              ))}
        </div>
        {/* Audience surfaces only ever see a count of what was blocked. */}
        {!isConsole && blocked > 0 && (
          <p className="pt-2 font-mono text-xs text-zinc-600">
            🚫 {blocked} {blocked === 1 ? 'entry' : 'entries'} blocked
          </p>
        )}
      </div>
    </div>
  );
}

function Resolver({
  room,
  display,
  title,
  info,
  prompt,
  options,
  revealAfterMs,
}: {
  room?: string;
  display?: boolean;
  title?: string;
  info?: string;
  prompt?: string;
  options?: string[];
  revealAfterMs?: number;
}) {
  const current = useQuery(api.talks.current, room ? 'skip' : {});
  const resolved = room ?? current?.room;
  if (!resolved) return null;
  return (
    <Activity
      room={resolved}
      display={display}
      title={title}
      info={info}
      prompt={prompt}
      options={options}
      revealAfterMs={revealAfterMs}
    />
  );
}

/**
 * Embedded "put the actions in order" activity (the toast exercise generalized).
 * The presenter opens a prompt + hidden canonical options; the audience builds an
 * ordered step list and submits; the wall fills live and the canonical answer
 * reveals on a timer (or via the deck's next-key). Mode-aware:
 * - attendee → reveal-gated + submission form (blocked entries show as a count),
 * - presenter (projected) → reveal-gated, display-only,
 * - console (2nd screen) → answer + every submission incl. blocked shown always.
 */
export default function OrderedActions({
  room,
  display,
  title,
  info,
  prompt,
  options,
  revealAfterMs,
}: {
  room?: string;
  display?: boolean;
  title?: string;
  info?: string;
  /** Slide-declared defaults — an admin can open the activity in one click. */
  prompt?: string;
  options?: string[];
  revealAfterMs?: number;
}) {
  if (!isConvexConfigured) return null;
  return (
    <Resolver
      room={room}
      display={display}
      title={title}
      info={info}
      prompt={prompt}
      options={options}
      revealAfterMs={revealAfterMs}
    />
  );
}
