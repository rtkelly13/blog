import { useQuery } from 'convex/react';
import PresenceBadge from '@/components/PresenceBadge';
import Reactions from '@/components/Reactions';
import TalkStatsChart from '@/components/TalkStatsChart';
import {
  BreakTimer,
  LivePoll,
  OrderedActions,
  QuestionQueue,
} from '@/components/talks';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

function Room() {
  const talk = useQuery(api.talks.current);

  if (talk === undefined) {
    return <p className="font-mono text-zinc-400">Connecting…</p>;
  }

  if (talk === null) {
    return (
      <div className="border-2 border-white bg-zinc-900 p-8">
        <p className="font-display text-2xl font-bold uppercase text-white">
          No talk is live right now
        </p>
        <p className="mt-3 font-mono text-sm text-zinc-400">
          <span className="text-brutalist-yellow">&gt;</span> This page joins
          whatever talk is running — check back when one starts.
        </p>
      </div>
    );
  }

  const { config } = talk;
  const anyInteractive = config.presence || config.reactions || config.follow;

  return (
    <div className="border-2 border-white bg-zinc-900 p-8">
      <p className="font-mono text-sm uppercase text-brutalist-pink">
        ● Live now
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold uppercase text-white">
        {talk.title}
      </h2>

      {config.presence && (
        <div className="mt-4">
          <PresenceBadge room={talk.room} />
        </div>
      )}

      {config.follow && (
        <p className="mt-6 font-mono text-sm">
          <a
            href={`/talks/${talk.slug}/present?mode=attendee`}
            className="border-2 border-white bg-brutalist-yellow px-4 py-2 font-bold uppercase text-black shadow-hard-md"
          >
            Watch along →
          </a>
        </p>
      )}

      {config.reactions && (
        <>
          <p className="mt-6 mb-3 font-mono text-sm uppercase text-zinc-400">
            React:
          </p>
          <Reactions room={talk.room} />
        </>
      )}

      {/* Interactive activities live inline — no codes, no extra tabs. The poll
          and ordered-actions panels stay hidden until the presenter opens one. */}
      <div className="mt-6 space-y-6">
        {/* Presenter-started break countdown — same server clock as the deck. */}
        <BreakTimer room={talk.room} />
        <LivePoll room={talk.room} />
        <OrderedActions room={talk.room} />
        <QuestionQueue room={talk.room} />
      </div>

      {config.closingChart && (
        <TalkStatsChart
          room={talk.room}
          threshold={config.chartThreshold}
          heading="This talk so far:"
        />
      )}

      {!anyInteractive && !config.closingChart && (
        <p className="mt-6 font-mono text-sm text-zinc-400">
          <span className="text-brutalist-yellow">&gt;</span> This talk is
          running.{' '}
          <a
            href={`/talks/${talk.slug}`}
            className="text-brutalist-cyan underline"
          >
            View the slides →
          </a>
        </p>
      )}

      {anyInteractive && (
        <p className="mt-6 font-mono text-sm text-zinc-400">
          <span className="text-brutalist-yellow">&gt;</span> You're in. Keep
          this tab open to stay counted.
        </p>
      )}
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="border-2 border-brutalist-pink bg-zinc-900 p-8 font-mono text-sm text-gray-300">
      Live talks aren't configured here (no Convex deployment).
    </div>
  );
}

/**
 * The live room, imported client-only (ssr:false) from pages/live. Everything
 * here depends on the Convex client, so keeping it out of the server render
 * means the page shell prerenders cleanly and can never crash at build time on
 * a missing ConvexProvider (e.g. CI, where Convex isn't configured).
 */
export default function LiveRoom() {
  return isConvexConfigured ? <Room /> : <NotConfigured />;
}
