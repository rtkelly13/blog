import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

/** Always-on closing card — the deck/finale message, shown with or without a chart. */
function Closing() {
  return (
    <div className="border-2 border-white bg-zinc-900 p-8 text-center">
      <p className="font-display text-3xl font-bold uppercase text-white">
        Thanks 👋
      </p>
      <a
        href="https://ryankelly.dev"
        className="mt-3 inline-block font-mono text-lg font-bold text-brutalist-cyan underline"
      >
        ryankelly.dev
      </a>
    </div>
  );
}

function Chart({ room, threshold }: { room: string; threshold: number }) {
  const stats = useQuery(api.talks.stats, { room });

  if (stats === undefined) {
    return <p className="font-mono text-zinc-400">Tallying…</p>;
  }

  // Threshold reveal: below the bar we just show the closing message, so a
  // quiet room never projects a near-empty chart. The chart layers in once
  // there's meaningful data.
  if (stats.totalReactions < threshold) {
    return <Closing />;
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

function Resolver({ room, threshold }: { room?: string; threshold?: number }) {
  const current = useQuery(api.talks.current, room ? 'skip' : {});
  const resolved = room ?? current?.room;
  // Fall back to the live talk's configured reveal threshold when not overridden.
  const effectiveThreshold =
    threshold ?? (room ? 0 : (current?.config.chartThreshold ?? 0));

  if (!room && current === undefined) {
    return <p className="font-mono text-zinc-400">Tallying…</p>;
  }
  if (!resolved) {
    return (
      <p className="font-mono text-sm text-zinc-500">No live talk to chart.</p>
    );
  }
  return <Chart room={resolved} threshold={effectiveThreshold} />;
}

/**
 * Closing stats for a talk: a live bar chart of reaction totals plus headline
 * counts, revealed only once reactions reach the talk's `chartThreshold` (until
 * then it shows the plain Thanks / ryankelly.dev closing). With no `room` it
 * resolves the currently-live talk and its configured threshold — so as the
 * finale view it auto-charts whichever run is on. Self-guarding without Convex.
 */
export default function TalkStatsChart({
  room,
  threshold,
}: {
  room?: string;
  threshold?: number;
}) {
  if (!isConvexConfigured) return null;
  return <Resolver room={room} threshold={threshold} />;
}
