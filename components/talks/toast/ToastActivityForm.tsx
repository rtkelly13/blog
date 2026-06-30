import { useMutation } from 'convex/react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import {
  MAX_NICKNAME_LEN,
  MAX_STEP_LEN,
  MAX_STEPS,
  TOAST_STEP_CARDS,
} from './steps';

interface ToastActivityFormProps {
  talkSlug: string;
}

/**
 * The student-facing submission form (the link/QR shared during the talk).
 * Hybrid input: tap a preset card to append it, or type a custom step. Reorder
 * with up/down (touch-friendly — no drag library), then submit the ordered list
 * to Convex. The profanity filter + 5s moderation buffer live server-side.
 */
export default function ToastActivityForm({
  talkSlug,
}: ToastActivityFormProps) {
  const submit = useMutation(api.toast.submit);
  const [steps, setSteps] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStep = (text: string) => {
    const value = text.trim().slice(0, MAX_STEP_LEN);
    if (!value || steps.length >= MAX_STEPS) return;
    setSteps((prev) => [...prev, value]);
  };

  const move = (index: number, delta: number) => {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async () => {
    if (steps.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submit({
        talkSlug,
        nickname: nickname.trim() || undefined,
        steps,
      });
      setDone(true);
    } catch (_err) {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSteps([]);
    setCustom('');
    setDone(false);
    setError(null);
  };

  if (done) {
    return (
      <div className="border-2 border-white bg-zinc-900 p-6 text-center shadow-hard-cyan">
        <p className="font-mono text-2xl font-bold uppercase text-brutalist-cyan">
          [ Sent! ]
        </p>
        <p className="mt-3 font-mono text-sm text-gray-200">
          Watch the big screen — your steps will appear in a few seconds.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 border-2 border-white bg-brutalist-yellow px-5 py-2 font-mono font-bold uppercase text-black shadow-hard-md transition-all hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          Send another
        </button>
      </div>
    );
  }

  const atMax = steps.length >= MAX_STEPS;

  return (
    <div className="space-y-6">
      {/* Chosen, ordered steps */}
      <div className="border-2 border-white bg-zinc-900 p-4">
        <p className="mb-3 font-mono text-xs font-bold uppercase text-brutalist-yellow">
          Your steps {steps.length > 0 ? `(${steps.length}/${MAX_STEPS})` : ''}
        </p>
        {steps.length === 0 ? (
          <p className="font-mono text-sm text-zinc-400">
            Add steps below, in the order you'd do them.
          </p>
        ) : (
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <li
                key={index}
                className="flex items-center gap-2 border-2 border-zinc-700 bg-black p-2"
              >
                <span className="font-mono text-sm font-bold text-brutalist-cyan">
                  {index + 1}.
                </span>
                <span className="flex-1 font-mono text-sm text-gray-100">
                  {step}
                </span>
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="border border-zinc-600 p-1 text-zinc-300 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => move(index, 1)}
                  disabled={index === steps.length - 1}
                  className="border border-zinc-600 p-1 text-zinc-300 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => removeStep(index)}
                  className="border border-zinc-600 p-1 text-brutalist-pink"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Preset cards */}
      <div>
        <p className="mb-3 font-mono text-xs font-bold uppercase text-brutalist-yellow">
          Tap to add
        </p>
        <div className="flex flex-wrap gap-2">
          {TOAST_STEP_CARDS.map((card) => (
            <button
              key={card}
              type="button"
              onClick={() => addStep(card)}
              disabled={atMax}
              className="border-2 border-white bg-black px-3 py-2 font-mono text-sm text-gray-100 transition-all hover:bg-brutalist-cyan hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              + {card}
            </button>
          ))}
        </div>
      </div>

      {/* Custom step */}
      <div>
        <p className="mb-3 font-mono text-xs font-bold uppercase text-brutalist-yellow">
          Or write your own
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={custom}
            maxLength={MAX_STEP_LEN}
            placeholder="e.g. plug the toaster in"
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addStep(custom);
                setCustom('');
              }
            }}
            className="flex-1 border-2 border-white bg-black px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-zinc-600 focus:border-brutalist-cyan focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              addStep(custom);
              setCustom('');
            }}
            disabled={atMax || !custom.trim()}
            className="flex items-center gap-1 border-2 border-white bg-brutalist-cyan px-3 py-2 font-mono text-sm font-bold uppercase text-black disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Nickname + submit */}
      <div className="border-t-2 border-white pt-6">
        <input
          type="text"
          value={nickname}
          maxLength={MAX_NICKNAME_LEN}
          placeholder="Your name or nickname (optional)"
          onChange={(e) => setNickname(e.target.value)}
          className="mb-4 w-full border-2 border-white bg-black px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-zinc-600 focus:border-brutalist-cyan focus:outline-none"
        />
        {error && (
          <p className="mb-3 font-mono text-sm text-brutalist-pink">{error}</p>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={steps.length === 0 || submitting}
          className="w-full border-2 border-white bg-brutalist-yellow px-6 py-3 font-mono text-lg font-bold uppercase text-black shadow-hard-md transition-all hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {submitting ? 'Sending…' : 'Send my toast recipe'}
        </button>
      </div>
    </div>
  );
}
