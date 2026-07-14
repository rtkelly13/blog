import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import ErrorLine from '@/components/admin/ErrorLine';
import { useRunAction } from '@/components/admin/useRunAction';
import { api } from '@/convex/_generated/api';
import { getMachineId } from '@/lib/machineId';
import { useRateLimitNotice } from '@/lib/useRateLimitNotice';
import { useDeckMode } from './DeckModeContext';
import RateLimitNotice from './RateLimitNotice';
import { ResolvedRoom } from './ResolvedRoom';
import { useActivitySlideRegistry, useSlideIndex } from './RevealBeatContext';

/** Live-updating seconds remaining until `revealAt` (null once elapsed/absent). */
export function useCountdown(
  revealAt: number | null | undefined,
): number | null {
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

/** One submission on the wall. Hidden rows (console only) are greyed + tagged. */
function SubmissionCard({
  nickname,
  steps,
  hidden,
  flagged,
}: {
  nickname?: string;
  steps: string[];
  hidden?: boolean;
  /** The profanity Mask fired (console only) — auto-hidden ≠ presenter-hidden. */
  flagged?: boolean;
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
        <span className="flex gap-1.5 font-mono text-xs uppercase">
          {flagged && <span className="text-brutalist-cyan">⚠ masked</span>}
          {hidden && <span className="text-zinc-500">🚫 hidden</span>}
        </span>
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
  // submission (including hidden ones) are ALWAYS visible for moderation. Every
  // other surface reads the reveal-gated audience view.
  const active = useQuery(api.activities.active, isConsole ? 'skip' : { room });
  const feedRes = useQuery(api.activities.feed, isConsole ? { room } : 'skip');
  const submit = useMutation(api.activities.submit);
  const openActivity = useMutation(api.activities.open);
  const revealNow = useMutation(api.activities.revealNow);
  const cancelReveal = useMutation(api.activities.cancelReveal);
  const isAdmin = useQuery(api.talks.isAdmin) === true;

  const [steps, setSteps] = useState<string[]>(['']);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const { secondsLeft, notify } = useRateLimitNotice();

  const consoleActivity = feedRes?.authorized ? feedRes.activity : null;
  const activity = isConsole ? consoleActivity : (active ?? null);

  const countdown = useCountdown(
    activity && !activity.revealed ? activity.revealAt : null,
  );

  // Presenter controls (open / reveal / cancel) surface their errors — a lapsed
  // admin session must not look like a working button.
  const { run: runControl, error: controlError } = useRunAction();

  // On a driving deck, tell the deck which slide declares the open activity so
  // the reveal beat arms there (matched by prompt; see RevealBeatContext).
  const slideIndex = useSlideIndex();
  const registry = useActivitySlideRegistry();
  useEffect(() => {
    if (!registry || slideIndex == null || !activity || !prompt) return;
    if (activity.prompt === prompt) registry.report(activity._id, slideIndex);
  }, [registry, slideIndex, activity, prompt]);

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
            runControl(() =>
              openActivity({
                room,
                prompt: prompt as string,
                options: defaultOptions as string[],
                revealDelayMs: revealAfterMs,
              }),
            )
          }
          className="border-2 border-white bg-brutalist-yellow px-5 py-2 font-mono font-bold uppercase text-black shadow-hard-md"
        >
          ▶ Open activity
        </button>
        <ErrorLine error={controlError} />
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
  const submissionCount = isConsole ? consoleSubs.length : audienceWall.length;
  const showForm = !display && mode === 'attendee';
  // Whether this activity has a canonical answer at all. The console reads it
  // directly from the full options; the audience gets a `hasAnswer` flag since
  // its `options` are withheld until reveal. Answer-less activities show no
  // countdown and no reveal block.
  const hasAnswer = isConsole
    ? (consoleActivity?.options.length ?? 0) > 0
    : (active?.hasAnswer ?? false);
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
      const res = await submit({
        activityId: activity._id,
        steps: filled,
        machineId: getMachineId(),
      });
      // `=== false` so the union narrows under this repo's `strict: false`.
      if (res.ok === false && res.reason === 'rate_limited') {
        // Refused, not dropped: keep the typed steps and show when to retry.
        notify(res.retryAfterMs);
      } else if (res.ok === false) {
        // Any other refusal (activities toggled off mid-type): say so and keep
        // the typed steps — a "✓ Submitted!" here would be a lie.
        setSendError('Submissions are closed for this session.');
      } else {
        setSteps(['']);
        setSubmitted(true);
        setSendError(null);
      }
    } catch {
      // e.g. the activity closed while typing (`submit` throws).
      setSendError('This activity has closed — your steps were not sent.');
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
            <RateLimitNotice secondsLeft={secondsLeft} />
            {sendError && (
              <p className="border-2 border-brutalist-pink bg-black p-3 font-mono text-sm text-brutalist-pink">
                {sendError}
              </p>
            )}
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
          {/* The reveal moment belongs to the presenter: reveal-now is always at
              hand on the console, and an opt-in auto-reveal timer can be
              cancelled here while it's still pending. */}
          {isConsole && !activity.revealed && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    runControl(() => revealNow({ id: activity._id }))
                  }
                  className="border-2 border-white bg-brutalist-cyan px-4 py-2 font-mono text-xs font-bold uppercase text-black shadow-hard-md"
                >
                  Reveal to room now
                </button>
                {countdown != null && (
                  <button
                    type="button"
                    onClick={() =>
                      runControl(() => cancelReveal({ id: activity._id }))
                    }
                    className="border-2 border-white bg-black px-4 py-2 font-mono text-xs font-bold uppercase text-white"
                  >
                    ✕ Cancel timer
                  </button>
                )}
              </div>
              <ErrorLine error={controlError} />
            </div>
          )}
        </div>
      )}
      {!isConsole && hasAnswer && !activity.revealed && countdown != null && (
        <p className="mt-4 font-mono text-xs uppercase text-zinc-500">
          Answer reveals in {countdown}s…
        </p>
      )}

      {/* Live wall of submissions. On the console, hidden entries stay visible
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
                  flagged={s.flagged}
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
      </div>
    </div>
  );
}

/**
 * Embedded "put the actions in order" activity (the toast exercise generalized).
 * The presenter opens a prompt + hidden canonical options; the audience builds an
 * ordered step list and submits; the wall fills live and the canonical answer
 * reveals when the presenter decides (the deck's next-key beat, the console's
 * reveal-now, or /admin) — an auto-reveal timer only runs if the slide opts in
 * via `revealAfterMs`. Mode-aware:
 * - attendee → reveal-gated + submission form (hidden entries are omitted),
 * - presenter (projected) → reveal-gated, display-only,
 * - console (2nd screen) → answer + every submission incl. hidden shown always.
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
  /**
   * Opt-in auto-reveal fallback. Omit (the default) and the answer stays hidden
   * until the presenter reveals it; set it only when a slide genuinely wants a
   * self-firing timer.
   */
  revealAfterMs?: number;
}) {
  return (
    <ResolvedRoom room={room}>
      {(r) => (
        <Activity
          room={r}
          display={display}
          title={title}
          info={info}
          prompt={prompt}
          options={options}
          revealAfterMs={revealAfterMs}
        />
      )}
    </ResolvedRoom>
  );
}
