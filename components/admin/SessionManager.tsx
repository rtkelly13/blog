import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '@/convex/_generated/api';
import { useRunAction } from './useRunAction';

/** Short, human date-time for a session's start (locale, no seconds). */
function when(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ClearDownButton({
  room,
  live,
  hasData,
}: {
  room: string;
  live: boolean;
  hasData: boolean;
}) {
  const clearDown = useMutation(api.sessions.clearDown);
  const { run, error, busy } = useRunAction();
  const [armed, setArmed] = useState(false);

  if (!hasData) {
    return (
      <span className="font-mono text-xs uppercase text-zinc-600">no data</span>
    );
  }

  // A live session can't be cleared — its data would repopulate from connected
  // clients — so surface that instead of a clear button until the talk ends.
  if (live) {
    return (
      <span className="font-mono text-xs uppercase text-zinc-600">
        end talk to clear
      </span>
    );
  }

  const wipe = () =>
    run(async () => {
      await clearDown({ room });
      setArmed(false);
    });

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="border-2 border-brutalist-pink px-3 py-1.5 font-mono text-xs font-bold uppercase text-brutalist-pink hover:bg-brutalist-pink hover:text-black"
      >
        Clear down
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="font-mono text-xs uppercase text-brutalist-pink">
        {error ?? 'Sure?'}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={wipe}
        className="border-2 border-brutalist-pink bg-brutalist-pink px-3 py-1.5 font-mono text-xs font-bold uppercase text-black disabled:opacity-40"
      >
        {busy ? '…' : 'Yes, wipe'}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="font-mono text-xs uppercase text-zinc-400 underline"
      >
        Cancel
      </button>
    </span>
  );
}

/**
 * Admin "Sessions" panel: every live run of a talk (a session = the room every
 * feature scopes to), newest first, with the volume of data it generated and a
 * per-session "Clear down" that wipes that data (keeping the session record).
 */
export default function SessionManager() {
  const data = useQuery(api.sessions.list, {});

  if (data === undefined) {
    return <p className="font-mono text-sm text-zinc-500">Loading sessions…</p>;
  }
  if (!data.authorized) return null;
  if (data.sessions.length === 0) {
    return (
      <p className="font-mono text-sm text-zinc-500">
        No sessions yet — start a talk and it'll appear here.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.sessions.map((s) => (
        <div
          key={s.room}
          className="flex flex-col gap-2 border-2 border-zinc-700 bg-black p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-sm text-white">
              {s.status === 'live' ? (
                <span className="text-brutalist-pink">● LIVE</span>
              ) : (
                <span className="text-zinc-500">ended</span>
              )}
              <span className="truncate font-bold">{s.title}</span>
            </p>
            <p className="mt-0.5 font-mono text-xs text-zinc-500">
              {when(s.startedAt)} · {s.counts.attendees} joined ·{' '}
              {s.counts.reactions} reactions · {s.counts.questions} questions ·{' '}
              {s.counts.polls} polls · {s.counts.activitySubmissions}{' '}
              submissions
            </p>
          </div>
          <div className="shrink-0">
            <ClearDownButton
              room={s.room}
              live={s.status === 'live'}
              hasData={s.hasData}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
