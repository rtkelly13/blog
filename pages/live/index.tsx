import { useQuery } from 'convex/react';
import PresenceBadge from '@/components/PresenceBadge';
import Reactions from '@/components/Reactions';
import { PageSEO } from '@/components/SEO';
import TalkStatsChart from '@/components/TalkStatsChart';
import LivePoll from '@/components/talks/LivePoll';
import OrderedActions from '@/components/talks/OrderedActions';
import QuestionQueue from '@/components/talks/QuestionQueue';
import { api } from '@/convex/_generated/api';
import siteMetadata from '@/data/siteMetadata';
import { isConvexConfigured } from '@/lib/convexClient';

function LiveRoom() {
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

export default function LivePage() {
  return (
    <>
      <PageSEO
        title={`Live - ${siteMetadata.author}`}
        description="Join the talk that's running right now."
      />
      <article className="mx-auto max-w-2xl py-10">
        <h1 className="mb-2 font-display text-4xl font-bold uppercase text-white">
          [ Live ]
        </h1>
        <p className="mb-8 font-mono text-sm text-zinc-400">
          <span className="text-brutalist-yellow">&gt;</span> Auto-joins the
          current talk — no code or link needed.
        </p>
        {isConvexConfigured ? <LiveRoom /> : <NotConfigured />}
      </article>
    </>
  );
}
