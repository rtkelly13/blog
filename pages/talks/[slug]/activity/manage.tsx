import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import { isConvexConfigured } from '@/lib/convexClient';
import { getTalkSlugs } from '@/lib/talks';

const ToastModeration = dynamic(
  () => import('@/components/talks/toast/ToastModeration'),
  {
    ssr: false,
    loading: () => (
      <p className="min-h-screen bg-black p-8 font-mono text-zinc-500">
        Connecting…
      </p>
    ),
  },
);

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

export default function ManagePage({
  slug,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const key = typeof router.query.key === 'string' ? router.query.key : '';

  return (
    <>
      <Head>
        <title>Toast moderation</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {isConvexConfigured ? (
        <ToastModeration talkSlug={slug} moderationKey={key} />
      ) : (
        <p className="min-h-screen bg-black p-8 font-mono text-brutalist-pink">
          [ Activity not configured. Set NEXT_PUBLIC_CONVEX_URL. ]
        </p>
      )}
    </>
  );
}

// Presenter tool — no site header/footer.
ManagePage.getLayout = (page: ReactElement) => page;
