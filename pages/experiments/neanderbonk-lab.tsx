import { FlaskConical } from 'lucide-react';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * The NeanderBonk judging pipeline without the game: target word, strictness,
 * and per-word rulings, fed by keyboard or open mic. Exists so the referee's
 * behaviour can be inspected on its own — see RefereeLab for the rationale.
 *
 * Client-only for the same reasons as the game page (microphone, lexicon
 * fetch), so it loads through `next/dynamic` with `ssr: false`.
 */
const RefereeLab = dynamic(
  () => import('@/components/experiments/neanderbonk/RefereeLab'),
  { ssr: false },
);

export default function NeanderBonkLabPage() {
  return (
    <>
      <PageSEO
        title={`NeanderBonk Lab - ${siteMetadata.author}`}
        description="The NeanderBonk referee on a lab bench: type or speak words and see exactly how each is ruled, without the game around it."
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="NEANDERBONK LAB"
          icon={FlaskConical}
          accent="cyan"
          subtitle="The referee on the bench — every ruling, no game"
        />
        <RefereeLab />
      </div>
    </>
  );
}
