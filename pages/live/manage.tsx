import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { PageSEO } from '@/components/SEO';
import { api } from '@/convex/_generated/api';
import siteMetadata from '@/data/siteMetadata';
import { isConvexConfigured } from '@/lib/convexClient';

function Manage({ talkKey }: { talkKey: string }) {
  const current = useQuery(api.talks.current);
  const start = useMutation(api.talks.start);
  const end = useMutation(api.talks.end);
  const [slug, setSlug] = useState('so-you-want-to-build-software');
  const [title, setTitle] = useState('So You Want To Build Software?');
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  return (
    <div className="border-2 border-white bg-zinc-900 p-6 font-mono">
      <p className="text-sm uppercase text-brutalist-cyan">
        {current ? `● Live: ${current.title}` : 'Nothing live'}
      </p>

      <div className="mt-6 space-y-3">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="talk slug"
          className="w-full border-2 border-white bg-black px-3 py-2 text-white"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="talk title"
          className="w-full border-2 border-white bg-black px-3 py-2 text-white"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => run(() => start({ slug, title, key: talkKey }))}
            className="border-2 border-white bg-brutalist-cyan px-5 py-2 font-bold uppercase text-black shadow-hard-md"
          >
            Start talk
          </button>
          <button
            type="button"
            onClick={() => run(() => end({ key: talkKey }))}
            disabled={!current}
            className="border-2 border-white bg-brutalist-pink px-5 py-2 font-bold uppercase text-black shadow-hard-md disabled:opacity-50"
          >
            End talk
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-brutalist-pink">{error}</p>}
    </div>
  );
}

export default function LiveManagePage() {
  const router = useRouter();
  const talkKey = typeof router.query.key === 'string' ? router.query.key : '';

  return (
    <>
      <PageSEO title={`Manage live - ${siteMetadata.author}`} description="" />
      <article className="mx-auto max-w-2xl py-10">
        <h1 className="mb-6 font-display text-3xl font-bold uppercase text-white">
          [ Presenter ]
        </h1>
        {!isConvexConfigured ? (
          <p className="font-mono text-brutalist-pink">
            Convex not configured.
          </p>
        ) : !talkKey ? (
          <p className="font-mono text-sm text-zinc-400">
            Add{' '}
            <code className="text-brutalist-cyan">
              ?key=&lt;moderation key&gt;
            </code>{' '}
            to the URL to start/end talks.
          </p>
        ) : (
          <Manage talkKey={talkKey} />
        )}
      </article>
    </>
  );
}
