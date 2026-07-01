import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

function Chart({
  room,
  threshold,
  heading,
}: {
  room: string;
  threshold: number;
  heading?: string;
}) {
  const stats = useQuery(api.talks.stats, { room });

  // Hide the whole section until there's meaningful data (reactions ≥ threshold).
  // No empty/placeholder state — nothing renders, heading included — so a quiet
  // room shows no chart section at all.
  if (stats === undefined || stats.totalReactions < threshold) return null;

  const max = Math.max(1, ...stats.reactions.map((r) => r.total));

  return (
    <>
      {heading && (
        <p className="mt-8 mb-3 font-mono text-sm uppercase text-zinc-400">
          {heading}
        </p>
      )}
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
      </div>
    </>
  );
}

function Resolver({
  room,
  threshold,
  heading,
}: {
  room?: string;
  threshold?: number;
  heading?: string;
}) {
  const current = useQuery(api.talks.current, room ? 'skip' : {});
  const resolved = room ?? current?.room;
  // Fall back to the live talk's configured reveal threshold when not overridden.
  const effectiveThreshold =
    threshold ?? (room ? 0 : (current?.config.chartThreshold ?? 0));

  if (!resolved) return null;
  return (
    <Chart room={resolved} threshold={effectiveThreshold} heading={heading} />
  );
}

/**
 * Live bar chart of a talk's reaction totals plus headline counts. It reveals
 * only once reactions reach `threshold`; below that it renders nothing at all
 * (no placeholder, no heading). With no `room` it resolves the currently-live
 * talk and its configured threshold. Self-guarding without Convex.
 */
export default function TalkStatsChart({
  room,
  threshold,
  heading,
}: {
  room?: string;
  threshold?: number;
  heading?: string;
}) {
  if (!isConvexConfigured) return null;
  return <Resolver room={room} threshold={threshold} heading={heading} />;
}
