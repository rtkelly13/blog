import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

const MEDALS = ['🥇', '🥈', '🥉', '4', '5'];
const BAR_COLORS = [
  'bg-brutalist-yellow',
  'bg-brutalist-cyan',
  'bg-brutalist-pink',
  'bg-white',
  'bg-white',
];

function Board({
  room,
  title,
  info,
  limit = 5,
}: {
  room: string;
  title?: string;
  info?: string;
  limit?: number;
}) {
  const stats = useQuery(api.talks.stats, { room });
  if (stats === undefined) return null;

  const top = stats.reactions.slice(0, Math.max(1, limit));
  const max = Math.max(1, ...top.map((r) => r.total));

  return (
    <div className="mx-auto w-full max-w-2xl border-2 border-white bg-zinc-900 p-6 text-left">
      <p className="mb-1 font-mono text-sm uppercase text-zinc-400">
        {title ?? 'Live emoji top 5'} · {stats.totalReactions} reactions
      </p>
      {info && <p className="mb-4 font-mono text-xs text-zinc-500">{info}</p>}
      {!info && <div className="mb-3" />}

      {top.length === 0 ? (
        <p className="py-8 text-center font-mono text-zinc-500">
          Tap a reaction — the leaderboard fills up live.
        </p>
      ) : (
        <div className="space-y-3">
          {top.map((r, i) => (
            <div key={r.emoji} className="flex items-center gap-3">
              <span className="w-8 text-center font-mono text-xl font-bold text-zinc-400">
                {MEDALS[i] ?? i + 1}
              </span>
              <span className="w-10 text-3xl">{r.emoji}</span>
              <div className="h-7 flex-1 border-2 border-white bg-black">
                <div
                  className={`h-full ${BAR_COLORS[i] ?? 'bg-white'} transition-all duration-500`}
                  style={{ width: `${(r.total / max) * 100}%` }}
                />
              </div>
              <span className="w-12 text-right font-mono text-lg font-bold text-white">
                {r.total}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Resolver({
  room,
  title,
  info,
  limit,
}: {
  room?: string;
  title?: string;
  info?: string;
  limit?: number;
}) {
  const current = useQuery(api.talks.current, room ? 'skip' : {});
  const resolved = room ?? current?.room;
  if (!resolved) return null;
  return <Board room={resolved} title={title} info={info} limit={limit} />;
}

/**
 * Live "top 5 reacted emoji" leaderboard — the audience-facing view of the same
 * reactionTotals the console chart draws from, ranked with medals. Embeddable in
 * a slide (resolves the live talk's room automatically) or given an explicit
 * `room`. `title`/`info` customise the heading. Renders nothing without Convex
 * or a live talk.
 */
export default function EmojiTop5({
  room,
  title,
  info,
  limit,
}: {
  room?: string;
  title?: string;
  info?: string;
  /** How many ranked emoji to show (default 5). */
  limit?: number;
}) {
  if (!isConvexConfigured) return null;
  return <Resolver room={room} title={title} info={info} limit={limit} />;
}
