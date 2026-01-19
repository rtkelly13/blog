import { getMDXComponent } from 'mdx-bundler/client';
import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
} from 'next';
import { useMemo } from 'react';
import SeriesLayout from '@/layouts/SeriesLayout';
import { getAllFilesFrontMatter, getFileBySlug } from '@/lib/mdx';
import { getAllSeries, getSeriesWithPosts } from '@/lib/series';

export const getStaticPaths: GetStaticPaths = async () => {
  const allSeries = getAllSeries();
  return {
    paths: allSeries.map((series) => ({
      params: { slug: series.slug },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const allPosts = await getAllFilesFrontMatter('blog');
  const seriesWithPosts = getSeriesWithPosts(params?.slug as string, allPosts);

  if (!seriesWithPosts) {
    return { notFound: true };
  }

  const seriesMDX = await getFileBySlug(
    'series' as any,
    params?.slug as string,
  );

  return {
    props: {
      series: seriesWithPosts,
      mdxSource: seriesMDX.mdxSource,
      frontMatter: seriesMDX.frontMatter,
    },
  };
};

export default function SeriesDetail({
  series,
  mdxSource,
  frontMatter,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const Component = useMemo(() => getMDXComponent(mdxSource), [mdxSource]);

  return (
    <SeriesLayout frontMatter={frontMatter} posts={series.posts}>
      <Component />
    </SeriesLayout>
  );
}
