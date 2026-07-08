import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import type { TalkFrontMatter } from 'types/TalkFrontMatter';
import type { TalkSlide } from '@/lib/talks';
import { getTalkBySlug, getTalkStaticPaths } from '@/lib/talks';

// Spectacle touches the DOM/window on mount, so render it client-side only.
const SpectacleDeck = dynamic(
  () => import('@/components/talks/SpectacleDeck'),
  {
    ssr: false,
  },
);

export const getStaticPaths = getTalkStaticPaths;

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
  // Only `printMode` (Spectacle's print-optimized, one-slide-per-page layout)
  // auto-opens the print dialog. `exportMode` is the scrollable overview and
  // must not trigger printing, or the PDF captures the wrong layout.
  const printing = router.query.printMode === 'true';

  // Open the print dialog once fonts AND client-rendered mermaid diagrams have
  // finished painting — a fixed timer would race async diagram rendering and
  // print blank diagram slides. Falls back to an 8s deadline.
  useEffect(() => {
    if (!printing) return;
    let cancelled = false;
    const deadline = Date.now() + 8000;

    const diagramsReady = () =>
      Array.from(document.querySelectorAll('.mermaid-diagram')).every((el) =>
        el.querySelector('svg'),
      );

    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(() => {
      const tick = () => {
        if (cancelled) return;
        if (diagramsReady() || Date.now() > deadline) {
          requestAnimationFrame(() => {
            if (!cancelled) window.print();
          });
          return;
        }
        setTimeout(tick, 150);
      };
      tick();
    });

    return () => {
      cancelled = true;
    };
  }, [printing]);

  return (
    <>
      <Head>
        <title>{frontMatter.title}</title>
        {frontMatter.draft && <meta name="robots" content="noindex,nofollow" />}
      </Head>
      {frontMatter.draft && (
        <div
          style={{
            position: 'fixed',
            top: '0.75rem',
            left: '0.75rem',
            zIndex: 50,
            border: '2px solid #f472b6',
            color: '#f472b6',
            background: '#000',
            padding: '0.2rem 0.5rem',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          ● Draft
        </div>
      )}
      <SpectacleDeck
        slides={slides}
        slug={frontMatter.slug}
        durationMins={frontMatter.durationMins}
        backgrounds={frontMatter.backgrounds}
        defaultBackground={frontMatter.background}
      />
    </>
  );
}

// Opt out of the global header/footer chrome for a true fullscreen deck.
Present.getLayout = (page: ReactElement) => page;
