import dynamic from 'next/dynamic';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

// The live room depends entirely on the Convex client, so render it client-only.
// The page shell (heading + intro) still prerenders for SEO/first paint.
const LiveRoom = dynamic(() => import('@/components/live/LiveRoom'), {
  ssr: false,
  loading: () => <p className="font-mono text-zinc-400">Connecting…</p>,
});

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
        <LiveRoom />
      </article>
    </>
  );
}
