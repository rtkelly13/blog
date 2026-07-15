import { FlaskConical, User } from 'lucide-react';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import type { ComponentProps } from 'react';
import type { SeriesMetadata } from 'types/Series';
import CyberHero from '@/components/CyberHero';
import Link from '@/components/Link';
import LiveTalkBanner from '@/components/LiveTalkBanner';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import ListLayout from '@/layouts/ListLayout';
import { getAllFilesFrontMatter } from '@/lib/mdx';
import { getAllSeries } from '@/lib/series';
import { getAllTags } from '@/lib/tags';

export const getStaticProps: GetStaticProps<{
  posts: ComponentProps<typeof ListLayout>['posts'];
  seriesData: Record<string, SeriesMetadata>;
  tagCounts: Record<string, number>;
}> = async () => {
  const posts = await getAllFilesFrontMatter('blog');
  const allSeries = getAllSeries();
  const seriesData = Object.fromEntries(allSeries.map((s) => [s.title, s]));
  const tagCounts = await getAllTags('blog');

  return { props: { posts, seriesData, tagCounts } };
};

export default function Home({
  posts,
  seriesData,
  tagCounts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const seriesMap = new Map(Object.entries(seriesData));

  return (
    <>
      <PageSEO
        title={siteMetadata.title}
        description={siteMetadata.description}
      />
      <div className="relative">
        <CyberHero />
        <LiveTalkBanner />
      </div>
      <div className="mt-12">
        <ListLayout
          posts={posts}
          title="LATEST POSTS"
          seriesMap={seriesMap}
          initialDisplayPosts={posts}
          tagCounts={tagCounts}
        />
      </div>

      {/* Secondary destinations, surfaced below the fold instead of crowding
          the header nav. */}
      <nav aria-label="More" className="mt-16 grid gap-6 sm:grid-cols-2">
        {EXPLORE.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group block border-2 border-white bg-zinc-900 p-6 shadow-hard-md transition-all hover:border-brutalist-cyan hover:shadow-hard-cyan active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            <Icon className="mb-4 h-10 w-10 text-brutalist-cyan" />
            <h2 className="mb-2 font-display text-xl font-bold uppercase text-white transition-colors group-hover:text-brutalist-cyan">
              [ {title} ]
            </h2>
            <p className="mb-4 font-mono text-sm text-zinc-400">
              {description}
            </p>
            <span className="font-mono text-sm font-bold text-brutalist-cyan">
              &gt; EXPLORE
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}

const EXPLORE = [
  {
    href: '/experiments',
    title: 'EXPERIMENTS',
    description:
      'Interactive prototypes, design systems, and creative explorations',
    icon: FlaskConical,
  },
  {
    href: '/about',
    title: 'ABOUT',
    description: 'Who I am and what I work on',
    icon: User,
  },
] as const;
