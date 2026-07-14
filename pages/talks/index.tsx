import { Presentation } from 'lucide-react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import type { TalkFrontMatter } from 'types/TalkFrontMatter';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import { TalkCard } from '@/components/talks';
import siteMetadata from '@/data/siteMetadata';
import { isConvexConfigured } from '@/lib/convexClient';
import { getAllTalksFrontMatter } from '@/lib/talks';
import { useIsAdmin } from '@/lib/useIsAdmin';

export const getStaticProps: GetStaticProps<{
  talks: TalkFrontMatter[];
}> = async () => {
  // Build drafts into the payload too; the page reveals them only to an admin.
  const talks = getAllTalksFrontMatter(true);
  return { props: { talks } };
};

function TalksContent({ visible }: { visible: TalkFrontMatter[] }) {
  return (
    <>
      <PageSEO
        title={`Talks - ${siteMetadata.author}`}
        description="Talks and presentations, hosted as interactive slide decks."
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="TALKS"
          icon={Presentation}
          accent="pink"
          subtitle="Presentations and slide decks, hosted live and exportable to PDF"
        />

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

// Admin-aware variant — reveals drafts to a signed-in admin. Rendered only when
// Convex is configured, so useIsAdmin always runs under a ConvexProvider.
function AdminAwareTalks({ talks }: { talks: TalkFrontMatter[] }) {
  const isAdmin = useIsAdmin();
  return <TalksContent visible={talks.filter((t) => isAdmin || !t.draft)} />;
}

export default function TalksPage({
  talks,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  // No Convex deployment (CI / SSG) means no ConvexProvider in the tree, so the
  // admin check can't run — show published talks only. When configured, defer
  // to the admin-aware variant, which reveals drafts to admins on the client.
  if (!isConvexConfigured) {
    return <TalksContent visible={talks.filter((t) => !t.draft)} />;
  }
  return <AdminAwareTalks talks={talks} />;
}
