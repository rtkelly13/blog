import { useMutation, useQuery } from 'convex/react';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface ToastModerationProps {
  talkSlug: string;
  moderationKey: string;
}

/**
 * Presenter moderation screen (gated by the `?key=` secret). Shows every
 * submission the instant it lands — including not-yet-revealed and flagged ones
 * — so the presenter can pull anything bad during the 5s buffer before it
 * reaches the audience wall.
 */
export default function ToastModeration({
  talkSlug,
  moderationKey,
}: ToastModerationProps) {
  const result = useQuery(api.toast.feed, { talkSlug, key: moderationKey });
  const setHidden = useMutation(api.toast.setHidden);
  const remove = useMutation(api.toast.remove);
  const clearAll = useMutation(api.toast.clearAll);

  if (result === undefined) {
    return <p className="p-6 font-mono text-zinc-500">Connecting…</p>;
  }

  if (!result.authorized) {
    return (
      <div className="p-6">
        <p className="border-2 border-brutalist-pink bg-zinc-900 p-4 font-mono text-brutalist-pink">
          [ Invalid or missing moderation key ]
        </p>
      </div>
    );
  }

  const { submissions } = result;

  const onClear = () => {
    if (
      window.confirm(
        'Delete ALL submissions for this talk? This cannot be undone.',
      )
    ) {
      clearAll({ talkSlug, key: moderationKey });
    }
  };

  return (
    <div className="min-h-screen bg-black px-6 py-8">
      <div className="mb-6 flex items-center justify-between border-b-2 border-white pb-4">
        <h1 className="font-mono text-2xl font-bold uppercase text-white">
          [ Moderation ] {submissions.length}
        </h1>
        <button
          type="button"
          onClick={onClear}
          className="border-2 border-brutalist-pink px-4 py-2 font-mono text-sm font-bold uppercase text-brutalist-pink transition-colors hover:bg-brutalist-pink hover:text-black"
        >
          Clear all
        </button>
      </div>

      {submissions.length === 0 ? (
        <p className="font-mono text-zinc-400">No submissions yet.</p>
      ) : (
        <ul className="space-y-3">
          {submissions.map((entry) => {
            const id = entry._id as Id<'toastSubmissions'>;
            return (
              <li
                key={entry._id}
                className={`border-2 p-4 ${
                  entry.flagged
                    ? 'border-brutalist-pink bg-pink-950/30'
                    : 'border-zinc-700 bg-zinc-900'
                } ${entry.hidden ? 'opacity-50' : ''}`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold uppercase text-brutalist-cyan">
                    {entry.nickname || 'Anonymous chef'}
                  </span>
                  {entry.flagged && (
                    <span className="border border-brutalist-pink px-2 py-0.5 font-mono text-xs font-bold uppercase text-brutalist-pink">
                      Flagged
                    </span>
                  )}
                  <span
                    className={`border px-2 py-0.5 font-mono text-xs font-bold uppercase ${
                      entry.hidden
                        ? 'border-zinc-500 text-zinc-500'
                        : entry.revealed
                          ? 'border-brutalist-cyan text-brutalist-cyan'
                          : 'border-brutalist-yellow text-brutalist-yellow'
                    }`}
                  >
                    {entry.hidden
                      ? 'Hidden'
                      : entry.revealed
                        ? 'On wall'
                        : 'Pending'}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setHidden({
                          id,
                          key: moderationKey,
                          hidden: !entry.hidden,
                        })
                      }
                      className="flex items-center gap-1 border border-zinc-500 px-2 py-1 font-mono text-xs uppercase text-zinc-200 hover:border-white"
                    >
                      {entry.hidden ? (
                        <>
                          <Eye className="h-3 w-3" /> Show
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" /> Hide
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove({ id, key: moderationKey })}
                      className="flex items-center gap-1 border border-brutalist-pink px-2 py-1 font-mono text-xs uppercase text-brutalist-pink hover:bg-brutalist-pink hover:text-black"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
                <ol className="space-y-0.5">
                  {entry.steps.map((step, index) => (
                    <li key={index} className="font-mono text-sm text-gray-200">
                      <span className="text-brutalist-yellow">
                        {index + 1}.
                      </span>{' '}
                      {step}
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
