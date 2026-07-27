import { Lightbulb } from 'lucide-react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import type { IdeaFrontMatter } from 'types/IdeaFrontMatter';
import { IdeaKindBadge, IdeaStatusBadge } from '@/components/ideas/IdeaBadges';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import { getAllIdeasFrontMatter } from '@/lib/ideas';

// Auth-gated and Convex-hook-driven, so render the gate client-only (same
// approach as /admin). The heading shell still prerenders.
const AdminGate = dynamic(() => import('@/components/admin/AdminGate'), {
  ssr: false,
  loading: () => <p className="font-mono text-zinc-400 p-6">Connecting…</p>,
});

export const getStaticProps: GetStaticProps<{
  ideas: IdeaFrontMatter[];
}> = async () => {
  return { props: { ideas: getAllIdeasFrontMatter() } };
};

export default function Ideas({
  ideas,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <PageSEO
        title={`Ideas - ${siteMetadata.author}`}
        description="Admin-only workbench for evolving post and series ideas before drafting."
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="IDEAS"
          icon={Lightbulb}
          accent="yellow"
          subtitle="Post & series workbench — evolve ideas before drafting. Admin only."
        />

        <AdminGate>
          <ul className="divide-y divide-white">
            {!ideas.length && (
              <li className="py-8 px-6 font-mono text-zinc-400 text-center">
                No ideas yet — add an MDX file under{' '}
                <code className="text-brutalist-cyan">data/ideas/</code>.
              </li>
            )}
            {ideas.map((idea) => (
              <li
                key={idea.slug}
                className="py-10 px-6 hover:bg-zinc-900 transition-colors"
              >
                <article className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <IdeaKindBadge kind={idea.kind} />
                    <IdeaStatusBadge status={idea.status} />
                    {(idea.updated ?? idea.created) && (
                      <span className="font-mono text-xs text-zinc-500">
                        touched {idea.updated ?? idea.created}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold leading-8 tracking-tight">
                    <Link
                      href={`/ideas/${idea.slug}`}
                      className="text-white hover:text-brutalist-cyan transition-colors"
                    >
                      {idea.title}
                    </Link>
                  </h2>
                  {idea.summary && (
                    <p className="font-mono text-sm text-zinc-400 max-w-3xl">
                      {idea.summary}
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ul>
        </AdminGate>
      </div>
    </>
  );
}
