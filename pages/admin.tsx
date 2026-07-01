import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import type { ReactNode } from 'react';
import AdminGate from '@/components/admin/AdminGate';
import TalkControls from '@/components/admin/TalkControls';
import { PageSEO } from '@/components/SEO';
import TalkStatsChart from '@/components/TalkStatsChart';
import { api } from '@/convex/_generated/api';
import siteMetadata from '@/data/siteMetadata';

const DEFAULT_SLUG = 'so-you-want-to-build-software';

// Convex deployment dashboard (functions, data, logs, env).
const CONVEX_DASHBOARD = 'https://dashboard.convex.dev';

function Card({
  title,
  children,
  accent = 'text-brutalist-cyan',
}: {
  title: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <section className="border-2 border-white bg-zinc-900 p-5">
      <h2
        className={`mb-3 font-mono text-xs uppercase tracking-wider ${accent}`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function ConfigBadges({
  config,
}: {
  config: {
    presence: boolean;
    reactions: boolean;
    follow: boolean;
    closingChart: boolean;
    chartThreshold: number;
  };
}) {
  const on = [
    config.presence && 'head-count',
    config.reactions && 'reactions',
    config.follow && 'follow',
    config.closingChart && `chart≥${config.chartThreshold}`,
  ].filter(Boolean) as string[];
  if (on.length === 0) {
    return <span className="text-zinc-500">talk-only (no live features)</span>;
  }
  return (
    <span className="flex flex-wrap gap-2">
      {on.map((label) => (
        <span
          key={label}
          className="border border-brutalist-cyan px-2 py-0.5 text-xs text-brutalist-cyan"
        >
          {label}
        </span>
      ))}
    </span>
  );
}

function Dashboard() {
  const current = useQuery(api.talks.current);
  const viewer = useQuery(api.talks.viewer);
  const { signOut } = useAuthActions();

  const slug = current?.slug ?? DEFAULT_SLUG;
  const isLive = Boolean(current);

  return (
    <div className="space-y-6">
      {/* Header: who + sign out */}
      <div className="flex items-center justify-between border-2 border-white bg-black px-4 py-3 font-mono text-sm">
        <span className="text-zinc-300">
          {viewer?.githubLogin ? (
            <>
              Signed in as{' '}
              <span className="text-brutalist-cyan">@{viewer.githubLogin}</span>
            </>
          ) : (
            'Signed in'
          )}
        </span>
        <button
          type="button"
          onClick={() => void signOut()}
          className="text-xs uppercase text-zinc-400 underline"
        >
          Sign out
        </button>
      </div>

      {/* Live status */}
      <Card title="Status" accent="text-brutalist-pink">
        {current ? (
          <div className="space-y-2 font-mono">
            <p className="font-display text-xl font-bold uppercase text-white">
              <span className="text-brutalist-pink">● Live</span> —{' '}
              {current.title}
            </p>
            <ConfigBadges config={current.config} />
          </div>
        ) : (
          <p className="font-mono text-zinc-400">
            Nothing live. Start a talk below.
          </p>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Start / control */}
        <Card title="Start / control a talk">
          <TalkControls />
        </Card>

        {/* Broadcast launcher */}
        <Card title="Broadcast" accent="text-brutalist-yellow">
          <div className="space-y-3 font-mono text-sm text-zinc-300">
            <p>
              Open the deck, then flip <b className="text-white">Broadcast</b>{' '}
              (top-right) to drive every follower's slides.
            </p>
            <a
              href={`/talks/${slug}/present`}
              target="_blank"
              rel="noreferrer"
              className="block border-2 border-white bg-brutalist-yellow px-4 py-2 text-center font-bold uppercase text-black shadow-hard-md"
            >
              Open deck to broadcast →
            </a>
            {!current?.config.follow && (
              <p className="text-xs text-zinc-500">
                Tip: broadcasting only drives followers when the live talk has{' '}
                <b>Follow-the-presenter</b> enabled.
              </p>
            )}
          </div>
        </Card>

        {/* Quick links / tools — extend this list as tools are added */}
        <Card title="Links & tools">
          <ul className="space-y-2 font-mono text-sm">
            <li>
              <a className="text-brutalist-cyan underline" href="/live">
                Audience view (/live)
              </a>
            </li>
            <li>
              <a
                className="text-brutalist-cyan underline"
                href={`/talks/${slug}/present?follow=live`}
                target="_blank"
                rel="noreferrer"
              >
                Follower view (what the audience sees)
              </a>
            </li>
            <li>
              <a
                className="text-brutalist-cyan underline"
                href={`/talks/${slug}`}
              >
                Talk landing page
              </a>
            </li>
            <li>
              <a
                className="text-brutalist-cyan underline"
                href={CONVEX_DASHBOARD}
                target="_blank"
                rel="noreferrer"
              >
                Convex dashboard (data / logs / env) ↗
              </a>
            </li>
          </ul>
        </Card>

        {/* Live stats snapshot */}
        <Card title="Live numbers">
          {isLive ? (
            <TalkStatsChart room={current?.room} threshold={0} />
          ) : (
            <p className="font-mono text-sm text-zinc-500">
              No live talk to chart.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <PageSEO title={`Admin - ${siteMetadata.author}`} description="" />
      <article className="mx-auto max-w-4xl py-10">
        <h1 className="mb-6 font-display text-3xl font-bold uppercase text-white">
          [ Admin ]
        </h1>
        <AdminGate>
          <Dashboard />
        </AdminGate>
      </article>
    </>
  );
}
