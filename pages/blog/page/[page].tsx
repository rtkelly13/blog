import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
} from 'next';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import type { SeriesMetadata } from 'types/Series';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import ListLayout from '@/layouts/ListLayout';
import { getAllFilesFrontMatter } from '@/lib/mdx';
import { getAllSeries } from '@/lib/series';
import { getAllTags } from '@/lib/tags';
import { POSTS_PER_PAGE } from '../../blog';

export const getStaticPaths: GetStaticPaths<{ page: string }> = async () => {
  const totalPosts = await getAllFilesFrontMatter('blog');
  const totalPages = Math.ceil(totalPosts.length / POSTS_PER_PAGE);
  const paths = Array.from({ length: totalPages }, (_, i) => ({
    params: { page: (i + 1).toString() },
  }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<{
  posts: PostFrontMatter[];
  initialDisplayPosts: PostFrontMatter[];
  pagination: { currentPage: number; totalPages: number };
  seriesData: Record<string, SeriesMetadata>;
  tagCounts: Record<string, number>;
}> = async (context) => {
  const {
    params: { page },
  } = context;
  const posts = await getAllFilesFrontMatter('blog');
  const pageNumber = parseInt(page as string, 10);
  const initialDisplayPosts = posts.slice(
    POSTS_PER_PAGE * (pageNumber - 1),
    POSTS_PER_PAGE * pageNumber,
  );
  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  };

  const allSeries = getAllSeries();
  const seriesData = Object.fromEntries(allSeries.map((s) => [s.title, s]));
  const tagCounts = await getAllTags('blog');

  return {
    props: {
      posts,
      initialDisplayPosts,
      pagination,
      seriesData,
      tagCounts,
    },
  };
};

export default function PostPage({
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
        title={siteMetadata.title}
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
