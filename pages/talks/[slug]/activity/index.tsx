import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { isConvexConfigured } from '@/lib/convexClient';
import { getAllTalksFrontMatter, getTalkSlugs } from '@/lib/talks';

// Convex hooks must not run during static generation, so load the form
// client-side only (same pattern as the Spectacle deck).
const ToastActivityForm = dynamic(
  () => import('@/components/talks/toast/ToastActivityForm'),
  {
    ssr: false,
    loading: () => (
      <p className="font-mono text-zinc-500">Loading the activity…</p>
    ),
  },
);

export async function getStaticPaths() {
  return {
    paths: getTalkSlugs().map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps<{
  slug: string;
  title: string;
}> = async ({ params }) => {
  const slug = params?.slug as string;
  const frontMatter = getAllTalksFrontMatter().find((t) => t.slug === slug);
  return { props: { slug, title: frontMatter?.title ?? slug } };
};

export default function ActivityPage({
  slug,
  title,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>{`Activity — ${title}`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="mx-auto max-w-2xl py-10">
        <header className="mb-8 border-2 border-white bg-zinc-900 p-6">
          <h1 className="font-mono text-3xl font-bold uppercase text-white md:text-4xl">
            [ How to make toast ]
          </h1>
          <p className="mt-3 font-mono text-sm text-gray-200">
            Write the exact steps to make a piece of toast — in order. We'll
            follow your instructions <em>literally</em> on the big screen. Be as
            precise as you can!
          </p>
        </header>

        {isConvexConfigured ? (
          <ToastActivityForm talkSlug={slug} />
        ) : (
          <p className="border-2 border-brutalist-pink bg-zinc-900 p-4 font-mono text-brutalist-pink">
            [ This activity isn't configured yet. Set NEXT_PUBLIC_CONVEX_URL. ]
          </p>
        )}
      </div>
    </>
  );
}
