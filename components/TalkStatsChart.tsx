import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

function Chart({ room }: { room: string }) {
  const stats = useQuery(api.talks.stats, { room });

  if (stats === undefined) {
    return <p className="font-mono text-zinc-400">Tallying…</p>;
  }

  const max = Math.max(1, ...stats.reactions.map((r) => r.total));

  return (
    <div className="border-2 border-white bg-zinc-900 p-6">
      <div className="mb-6 flex flex-wrap gap-x-10 gap-y-2 font-mono">
        <div>
          <div className="font-display text-5xl font-bold text-brutalist-cyan">
            {stats.totalReactions}
          </div>
          <div className="text-xs uppercase text-zinc-400">reactions</div>
        </div>
        <div>
          <div className="font-display text-5xl font-bold text-brutalist-yellow">
            {stats.attendees}
          </div>
          <div className="text-xs uppercase text-zinc-400">people joined</div>
        </div>
      </div>

      {stats.reactions.length === 0 ? (
        <p className="font-mono text-sm text-zinc-500">
          No reactions yet — tap some emojis!
        </p>
      ) : (
        <div className="space-y-3">
          {stats.reactions.map((r) => (
            <div key={r.emoji} className="flex items-center gap-3">
              <span className="w-8 text-2xl">{r.emoji}</span>
              <div className="h-6 flex-1 border-2 border-white bg-black">
                <div
                  className="h-full bg-brutalist-cyan transition-all duration-500"
                  style={{ width: `${(r.total / max) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono font-bold text-white">
                {r.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Resolver({ room }: { room?: string }) {
  const current = useQuery(api.talks.current, room ? 'skip' : {});
  const resolved = room ?? current?.room;

  if (!room && current === undefined) {
    return <p className="font-mono text-zinc-400">Tallying…</p>;
  }
  if (!resolved) {
    return (
      <p className="font-mono text-sm text-zinc-500">No live talk to chart.</p>
    );
  }
  return <Chart room={resolved} />;
}

/**
 * Closing stats for a talk: a live bar chart of reaction totals plus headline
 * counts. With no `room` it resolves the currently-live talk — so as the deck's
 * final slide it auto-charts whichever run is on (each of the day's 3 talks is
 * its own session). Self-guarding without Convex.
 */
export default function TalkStatsChart({ room }: { room?: string }) {
  if (!isConvexConfigured) return null;
  return <Resolver room={room} />;
}
