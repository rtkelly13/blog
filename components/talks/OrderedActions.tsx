import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

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

function Activity({ room }: { room: string }) {
  const activity = useQuery(api.activities.active, { room });
  const submit = useMutation(api.activities.submit);
  const [steps, setSteps] = useState<string[]>(['']);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const countdown = useCountdown(
    activity && !activity.revealed ? activity.revealAt : null,
  );

  // No open activity → render nothing.
  if (!activity) return null;

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
        ● Put it in order
      </p>
      <h3 className="mb-4 font-display text-2xl font-bold uppercase text-white">
        {activity.prompt}
      </h3>

      {submitted ? (
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
      )}

      {/* Canonical options: hidden until reveal, with a countdown while waiting. */}
      {activity.revealed && activity.options.length > 0 && (
        <div className="mt-5 border-2 border-brutalist-cyan bg-black p-4">
          <p className="mb-2 font-mono text-xs uppercase text-brutalist-cyan">
            One good order:
          </p>
          <ol className="space-y-1">
            {activity.options.map((opt, i) => (
              <li key={opt} className="font-mono text-sm text-white">
                <span className="text-brutalist-cyan">{i + 1}.</span> {opt}
              </li>
            ))}
          </ol>
        </div>
      )}
      {!activity.revealed && countdown != null && (
        <p className="mt-4 font-mono text-xs uppercase text-zinc-500">
          Answer reveals in {countdown}s…
        </p>
      )}

      {/* Live wall of everyone's submissions. */}
      <div className="mt-5">
        <p className="mb-2 font-mono text-xs uppercase text-zinc-400">
          The room ({activity.submissionCount})
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {activity.wall.map((s) => (
            <div key={s._id} className="border-2 border-zinc-700 bg-black p-3">
              {s.nickname && (
                <p className="mb-1 font-mono text-xs text-brutalist-pink">
                  {s.nickname}
                </p>
              )}
              <ol className="space-y-0.5">
                {s.steps.map((step, i) => (
                  <li key={i} className="font-mono text-xs text-zinc-300">
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        {activity.blocked > 0 && (
          <p className="pt-2 font-mono text-xs text-zinc-600">
            🚫 {activity.blocked} {activity.blocked === 1 ? 'entry' : 'entries'}{' '}
            blocked
          </p>
        )}
      </div>
    </div>
  );
}

function Resolver({ room }: { room?: string }) {
  const current = useQuery(api.talks.current, room ? 'skip' : {});
  const resolved = room ?? current?.room;
  if (!resolved) return null;
  return <Activity room={resolved} />;
}

/**
 * Embedded "put the actions in order" activity (the toast exercise generalized).
 * The presenter opens a prompt + hidden canonical options from the console; the
 * audience builds an ordered step list and submits; the wall fills live, and the
 * canonical answer reveals on a timer. Renders nothing when no activity is open.
 */
export default function OrderedActions({ room }: { room?: string }) {
  if (!isConvexConfigured) return null;
  return <Resolver room={room} />;
}
