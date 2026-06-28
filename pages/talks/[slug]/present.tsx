import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import type { TalkFrontMatter } from 'types/TalkFrontMatter';
import Slide from '@/components/talks/Slide';
import Slideshow from '@/components/talks/Slideshow';
import { getTalkBySlug, getTalkSlugs } from '@/lib/talks';

export async function getStaticPaths() {
  return {
    paths: getTalkSlugs().map((slug) => ({ params: { slug } })),
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps<{
  frontMatter: TalkFrontMatter;
  slides: string[];
}> = async ({ params }) => {
  const slug = params.slug as string;
  const talk = await getTalkBySlug(slug);
  if (!talk) return { notFound: true };

  return { props: { frontMatter: talk.frontMatter, slides: talk.slides } };
};

/**
 * Print-friendly layout: every slide on its own landscape page. Diagrams render
 * client-side, so we wait for fonts and a short settle delay before opening the
 * print dialog. Slides are rendered visibly (not display:none) so mermaid SVGs
 * size correctly.
 */
function PrintDeck({
  slides,
  frontMatter,
}: {
  slides: string[];
  frontMatter: TalkFrontMatter;
}) {
  useEffect(() => {
    let cancelled = false;
    const triggerPrint = () => {
      if (!cancelled) window.print();
    };
    const ready = document.fonts?.ready ?? Promise.resolve();
    ready.then(() => {
      const timer = setTimeout(triggerPrint, 800);
      return () => clearTimeout(timer);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="print-deck bg-black text-white">
      <Head>
        <title>{frontMatter.title}</title>
      </Head>
      {slides.map((code, i) => (
        <section
          // biome-ignore lint/suspicious/noArrayIndexKey: slides are a stable ordered list
          key={i}
          className="print-slide mx-auto flex min-h-screen max-w-5xl flex-col justify-center p-16"
        >
          <Slide code={code} />
        </section>
      ))}
    </div>
  );
}

export default function Present({
  frontMatter,
  slides,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();
  const isPdf = router.query.pdf === '1';

  if (isPdf) {
    return <PrintDeck slides={slides} frontMatter={frontMatter} />;
  }

  return <Slideshow slides={slides} frontMatter={frontMatter} />;
}

// Opt out of the global header/footer chrome for a true fullscreen deck.
Present.getLayout = (page: ReactElement) => page;
