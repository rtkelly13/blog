import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import type { ComponentProps } from 'react';
import type { SeriesMetadata } from 'types/Series';
import MountainHero from '@/components/MountainHero';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import ListLayout from '@/layouts/ListLayout';
import { getAllFilesFrontMatter } from '@/lib/mdx';
import { getAllSeries } from '@/lib/series';

export const getStaticProps: GetStaticProps<{
  posts: ComponentProps<typeof ListLayout>['posts'];
  seriesData: Record<string, SeriesMetadata>;
}> = async () => {
  const posts = await getAllFilesFrontMatter('blog');
  const allSeries = getAllSeries();
  const seriesData = Object.fromEntries(allSeries.map((s) => [s.title, s]));

  return { props: { posts, seriesData } };
};

export default function Home({
  posts,
  seriesData,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const seriesMap = new Map(Object.entries(seriesData));

  return (
    <>
      <PageSEO
        title={siteMetadata.title}
        description={siteMetadata.description}
      />
      <MountainHero />
      <div className="mt-12">
        <ListLayout
          posts={posts}
          title="Latest Posts"
          seriesMap={seriesMap}
          initialDisplayPosts={posts}
        />
      </div>
    </>
  );
}
