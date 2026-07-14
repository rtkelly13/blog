import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import { useRunAction } from './useRunAction';

/**
 * Presenter evaluation surface for an open ordered-actions activity. Renders
 * every submission (including hidden ones, straight from `activities.feed`) as
 * compact numbered-steps cards in a responsive grid so answers can be scanned
 * and compared side by side, with in-context controls on each card:
 * - mark/unmark — highlight the submission being worked through with the room
 *   (presenter-only; the audience wall never sees it),
 * - hide/restore — pull it from / return it to the audience wall.
 */
export default function ActivityEvalGrid({
  submissions,
}: {
  submissions: Doc<'activitySubmissions'>[];
}) {
  const setHidden = useMutation(api.activities.setHidden);
  const setMarked = useMutation(api.activities.setMarked);
  const { run, error } = useRunAction();

  if (submissions.length === 0) {
    return (
      <p className="font-mono text-xs text-zinc-500">No submissions yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(13rem,1fr))]">
        {submissions.map((s) => (
          <div
            key={s._id}
            className={`flex flex-col border-2 bg-black p-2 ${
              s.marked
                ? 'border-brutalist-yellow shadow-hard-yellow'
                : s.hidden
                  ? 'border-zinc-800 opacity-60'
                  : 'border-zinc-700'
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-brutalist-pink">
                {s.nickname ?? 'anon'}
              </span>
              <span className="flex shrink-0 gap-1.5 font-mono text-[10px] uppercase">
                {s.marked && (
                  <span className="text-brutalist-yellow">★ marked</span>
                )}
                {/* ADR-0002: auto-masked ≠ presenter-hidden — tag them apart. */}
                {s.flagged && (
                  <span className="text-brutalist-cyan">⚠ masked</span>
                )}
                {s.hidden && <span className="text-zinc-500">hidden</span>}
              </span>
            </div>
            <ol
              className={`mb-2 space-y-0.5 ${s.hidden ? 'line-through' : ''}`}
            >
              {/* Steps are positional (order is the point), so index keys are fine. */}
              {s.steps.map((step, i) => (
                <li key={i} className="font-mono text-xs text-zinc-200">
                  <span className="text-zinc-500">{i + 1}.</span> {step}
                </li>
              ))}
            </ol>
            {/* Pre-mask original (ADR-0002): presenter-only, so a false-positive
                mask ("Scunthorpe") is judgeable at a glance. */}
            {(s.originalSteps || s.originalNickname) && (
              <p className="mb-2 border-l-2 border-brutalist-cyan pl-1.5 font-mono text-[10px] text-zinc-400">
                original: {s.originalNickname && <>“{s.originalNickname}” · </>}
                {s.originalSteps?.join(' → ')}
              </p>
            )}
            <div className="mt-auto flex gap-3 font-mono text-[10px] uppercase">
              <button
                type="button"
                className="text-brutalist-yellow underline"
                onClick={() =>
                  run(() => setMarked({ id: s._id, marked: !s.marked }))
                }
              >
                {s.marked ? 'unmark' : 'mark'}
              </button>
              <button
                type="button"
                className="text-brutalist-pink underline"
                onClick={() =>
                  run(() => setHidden({ id: s._id, hidden: !s.hidden }))
                }
              >
                {s.hidden ? 'restore' : 'hide'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p className="font-mono text-xs text-brutalist-pink">{error}</p>
      )}
    </div>
  );
}
