import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import type { TalkFrontMatter } from 'types/TalkFrontMatter';
import type { TalkSlide } from '@/lib/talks';
import { getTalkBySlug, getTalkSlugs } from '@/lib/talks';

// Spectacle touches the DOM/window on mount, so render it client-side only.
const SpectacleDeck = dynamic(
  () => import('@/components/talks/SpectacleDeck'),
  {
    ssr: false,
  },
);

export async function getStaticPaths() {
  return {
    paths: getTalkSlugs().map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps<{
  frontMatter: TalkFrontMatter;
  slides: TalkSlide[];
}> = async ({ params }) => {
  const slug = params.slug as string;
  const talk = await getTalkBySlug(slug);
  if (!talk) return { notFound: true };

  return { props: { frontMatter: talk.frontMatter, slides: talk.slides } };
};

export default function Present({
  frontMatter,
  slides,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const exporting =
    router.query.exportMode === 'true' || router.query.printMode === 'true';

  // In export/print mode, open the print dialog once everything (incl. fonts
  // and client-rendered diagrams) has settled.
  useEffect(() => {
    if (!exporting) return;
    let cancelled = false;
    const ready = document.fonts?.ready ?? Promise.resolve();
    let timer: ReturnType<typeof setTimeout>;
    ready.then(() => {
      timer = setTimeout(() => {
        if (!cancelled) window.print();
      }, 1200);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exporting]);

  return (
    <>
      <Head>
        <title>{frontMatter.title}</title>
      </Head>
      <SpectacleDeck slides={slides} slug={frontMatter.slug} />
    </>
  );
}

// Opt out of the global header/footer chrome for a true fullscreen deck.
Present.getLayout = (page: ReactElement) => page;
