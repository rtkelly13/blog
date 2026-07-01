import { useMutation, useQuery } from 'convex/react';
import PresenceBadge from '@/components/PresenceBadge';
import Reactions from '@/components/Reactions';
import { PageSEO } from '@/components/SEO';
import { api } from '@/convex/_generated/api';
import siteMetadata from '@/data/siteMetadata';
import { isConvexConfigured } from '@/lib/convexClient';

function LiveHello() {
  const data = useQuery(api.hello.get);
  const bump = useMutation(api.hello.bump);

  return (
    <div className="border-2 border-white bg-zinc-900 p-8">
      <p className="font-mono text-2xl font-bold text-white md:text-3xl">
        {data === undefined ? 'Connecting…' : data.message}
      </p>
      <p className="mt-6 font-mono text-sm uppercase text-brutalist-cyan">
        Shared counter (live across every open tab)
      </p>
      <p className="font-mono text-6xl font-bold text-brutalist-yellow">
        {data?.count ?? '—'}
      </p>
      <button
        type="button"
        onClick={() => bump()}
        disabled={data === undefined}
        className="mt-6 border-2 border-white bg-brutalist-cyan px-6 py-3 font-mono font-bold uppercase text-black shadow-hard-md transition-all hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
      >
        Bump it +1
      </button>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="border-2 border-brutalist-pink bg-zinc-900 p-8 font-mono">
      <p className="text-xl font-bold uppercase text-brutalist-pink">
        [ Convex not configured ]
      </p>
      <p className="mt-3 text-sm text-gray-300">
        Set <code className="text-brutalist-cyan">NEXT_PUBLIC_CONVEX_URL</code>{' '}
        (via <code className="text-brutalist-cyan">npx convex dev</code>) to see
        this live. The rest of the site runs unchanged without it.
      </p>
    </div>
  );
}

export default function ConvexHello() {
  return (
    <>
      <PageSEO
        title={`Convex Hello World - ${siteMetadata.author}`}
        description="A minimal live Convex example: a shared counter synced across tabs."
      />
      <article className="mx-auto max-w-2xl py-10">
        <h1 className="mb-2 font-display text-4xl font-bold uppercase text-white">
          [ Convex Hello World ]
        </h1>
        <p className="mb-4 font-mono text-sm text-zinc-400">
          <span className="text-brutalist-yellow">&gt;</span> A reactive query +
          a mutation. Open this page in two tabs and click — both update live.
        </p>
        <div className="mb-4">
          <PresenceBadge room="convex-hello" />
        </div>
        <div className="mb-8">
          <Reactions room="convex-hello" />
        </div>
        {isConvexConfigured ? <LiveHello /> : <NotConfigured />}
      </article>
    </>
  );
}
