import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import dynamic from 'next/dynamic';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import { getAllTalksFrontMatter } from '@/lib/talks';

// The cockpit is entirely Convex/auth-driven, so render it client-only. The
// page shell (heading) still prerenders; the dashboard never touches SSR.
const AdminDashboard = dynamic(
  () => import('@/components/admin/AdminDashboard'),
  {
    ssr: false,
    loading: () => <p className="font-mono text-zinc-400">Loading admin…</p>,
  },
);

// Talk targets come from deck frontmatter (build-time fs), which the
// client-only dashboard can't read — so bake a slug → durationMins map into
// the page props for the live-talk clock, plus the slug/title list so the
// start form offers real decks instead of free-text (a typo'd slug makes a
// room the deck never drives). Drafts included: admins run those.
export const getStaticProps: GetStaticProps<{
  talkDurations: Record<string, number>;
  talkOptions: { slug: string; title: string }[];
}> = async () => {
  const talkDurations: Record<string, number> = {};
  const talkOptions: { slug: string; title: string }[] = [];
  for (const talk of getAllTalksFrontMatter(true)) {
    if (talk.durationMins != null) talkDurations[talk.slug] = talk.durationMins;
    talkOptions.push({ slug: talk.slug, title: talk.title });
  }
  return { props: { talkDurations, talkOptions } };
};

export default function AdminPage({
  talkDurations,
  talkOptions,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <PageSEO title={`Admin - ${siteMetadata.author}`} description="" />
      <article className="mx-auto max-w-4xl py-10">
        <h1 className="mb-6 font-display text-3xl font-bold uppercase text-white">
          [ Admin ]
        </h1>
        <AdminDashboard
          talkDurations={talkDurations}
          talkOptions={talkOptions}
        />
      </article>
    </>
  );
}
