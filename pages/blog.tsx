import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import type { ComponentProps } from 'react';
import type { SeriesMetadata } from 'types/Series';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import ListLayout from '@/layouts/ListLayout';
import { getAllFilesFrontMatter } from '@/lib/mdx';
import { getAllSeries } from '@/lib/series';
import { getAllTags } from '@/lib/tags';

export const POSTS_PER_PAGE = 5;

export const getStaticProps: GetStaticProps<{
  posts: ComponentProps<typeof ListLayout>['posts'];
  initialDisplayPosts: ComponentProps<typeof ListLayout>['initialDisplayPosts'];
  pagination: ComponentProps<typeof ListLayout>['pagination'];
  seriesData: Record<string, SeriesMetadata>;
  tagCounts: Record<string, number>;
}> = async () => {
  const posts = await getAllFilesFrontMatter('blog');
  const initialDisplayPosts = posts.slice(0, POSTS_PER_PAGE);
  const pagination = {
    currentPage: 1,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  };

  const allSeries = getAllSeries();
  const seriesData = Object.fromEntries(allSeries.map((s) => [s.title, s]));
  const tagCounts = await getAllTags('blog');

  return {
    props: { initialDisplayPosts, posts, pagination, seriesData, tagCounts },
  };
};

export default function Blog({
  posts,
  initialDisplayPosts,
  pagination,
  seriesData,
  tagCounts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const seriesMap = new Map(Object.entries(seriesData));

  return (
    <>
      <PageSEO
        title={`Blog - ${siteMetadata.author}`}
        description={siteMetadata.description}
      />
      <ListLayout
        posts={posts}
        initialDisplayPosts={initialDisplayPosts}
        pagination={pagination}
        title="All Posts"
        seriesMap={seriesMap}
        tagCounts={tagCounts}
      />
    </>
  );
}
