import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import type { ReactElement } from 'react';
import { isConvexConfigured } from '@/lib/convexClient';
import { getTalkSlugs } from '@/lib/talks';

const ToastWall = dynamic(() => import('@/components/talks/toast/ToastWall'), {
  ssr: false,
  loading: () => (
    <p className="min-h-screen bg-black p-8 font-mono text-zinc-500">
      Connecting…
    </p>
  ),
});

export async function getStaticPaths() {
  return {
    paths: getTalkSlugs().map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps<{ slug: string }> = async ({
  params,
}) => {
  return { props: { slug: params?.slug as string } };
};

export default function WallPage({
  slug,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>Toast wall</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {isConvexConfigured ? (
        <ToastWall talkSlug={slug} />
      ) : (
        <p className="min-h-screen bg-black p-8 font-mono text-brutalist-pink">
          [ Activity not configured. Set NEXT_PUBLIC_CONVEX_URL. ]
        </p>
      )}
    </>
  );
}

// Full-screen projector view — no site header/footer.
WallPage.getLayout = (page: ReactElement) => page;
