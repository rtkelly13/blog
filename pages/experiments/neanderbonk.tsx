import { Gavel } from 'lucide-react';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * An automatic referee for Poetry for Neanderthals.
 *
 * The whole app is client-only — microphone, Web Audio, and a ~950 KB syllable
 * lexicon fetched at runtime — so it loads through `next/dynamic` with
 * `ssr: false`, exactly as the MDX interactives do. Two consequences worth
 * keeping true:
 *
 * 1. **Nothing here costs another route anything.** The engine, the UI and the
 *    lexicon are a lazy chunk plus a static asset, reached only by visiting this
 *    page. It adds no npm dependency, so no shared bundle grows either.
 * 2. **The lexicon is a `public/` asset, not an import.** Bundling a megabyte of
 *    pronunciation data into JavaScript would defeat the point; it is fetched
 *    on mount and cached by the browser.
 *
 * `next/dynamic`'s SWC transform needs the options object inline — a shared
 * variable type-checks but fails the build.
 */
const NeanderBonk = dynamic(
  () => import('@/components/experiments/neanderbonk/NeanderBonk'),
  { ssr: false },
);

export default function NeanderBonkPage() {
  return (
    <>
      <PageSEO
        title={`NeanderBonk - ${siteMetadata.author}`}
        description="A browser-based automatic referee for Poetry for Neanderthals: it listens, counts syllables, and calls the bonk."
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="NEANDERBONK"
          icon={Gavel}
          accent="pink"
          subtitle="Listens to the poet, counts syllables, calls the bonk"
        />
        <NeanderBonk />
      </div>
    </>
  );
}
