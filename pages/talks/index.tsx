import { Presentation } from 'lucide-react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import type { TalkFrontMatter } from 'types/TalkFrontMatter';
import { PageSEO } from '@/components/SEO';
import TalkCard from '@/components/talks/TalkCard';
import siteMetadata from '@/data/siteMetadata';
import { getAllTalksFrontMatter } from '@/lib/talks';
import { useIsAdmin } from '@/lib/useIsAdmin';

export const getStaticProps: GetStaticProps<{
  talks: TalkFrontMatter[];
}> = async () => {
  // Build drafts into the payload too; the page reveals them only to an admin.
  const talks = getAllTalksFrontMatter(true);
  return { props: { talks } };
};

export default function TalksPage({
  talks,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const isAdmin = useIsAdmin();
  const visible = talks.filter((t) => isAdmin || !t.draft);
  return (
    <>
      <PageSEO
        title={`Talks - ${siteMetadata.author}`}
        description="Talks and presentations, hosted as interactive slide decks."
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <div className="bg-zinc-900 px-6 pt-8 pb-10">
          <div className="mb-4 flex items-center gap-4">
            <Presentation className="h-10 w-10 text-brutalist-cyan" />
            <h1 className="font-display text-4xl font-bold uppercase text-white md:text-6xl">
              [ TALKS ]
            </h1>
          </div>
          <p className="mt-4 font-mono text-lg text-zinc-400">
            <span className="text-brutalist-yellow">&gt;</span> Presentations
            and slide decks, hosted live and exportable to PDF
          </p>
        </div>

        <div className="px-6 py-12">
          {visible.length === 0 ? (
            <p className="font-mono text-zinc-400">
              <span className="text-brutalist-pink">&gt;</span> No talks yet.
              Check back soon.
            </p>
          ) : (
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
              {visible.map((talk) => (
                <TalkCard key={talk.slug} talk={talk} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
