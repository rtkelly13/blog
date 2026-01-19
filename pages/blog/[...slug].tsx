import fs from 'node:fs';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import type { AuthorFrontMatter } from 'types/AuthorFrontMatter';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import type { Toc } from 'types/Toc';
import { MDXLayoutRenderer } from '@/components/MDXComponents';
import PageTitle from '@/components/PageTitle';
import generateRss from '@/lib/generate-rss';
import {
  formatSlug,
  getAllFilesFrontMatter,
  getFileBySlug,
  getFiles,
} from '@/lib/mdx';
import { getSeriesNavigation } from '@/lib/series';
import { show_drafts } from '@/lib/utils/showDrafts';

const DEFAULT_LAYOUT = 'PostLayout';

export async function getStaticPaths() {
  const posts = getFiles('blog');
  return {
    paths: posts.map((p) => ({
      params: {
        slug: formatSlug(p).split('/'),
      },
    })),
    fallback: false,
  };
}

// @ts-expect-error
export const getStaticProps: GetStaticProps<{
  post: { mdxSource: string; toc: Toc; frontMatter: PostFrontMatter };
  authorDetails: AuthorFrontMatter[];
  prev?: { slug: string; title: string };
  next?: { slug: string; title: string };
  seriesData?: {
    prev: { slug: string; title: string; order: number } | null;
    next: { slug: string; title: string; order: number } | null;
    series: {
      slug: string;
      title: string;
      description: string;
      tags: string[];
      status: 'planned' | 'in-progress' | 'completed';
      summary: string;
    };
    allInSeries: { slug: string; title: string; order: number }[];
  };
}> = async ({ params }) => {
  const slug = (params.slug as string[]).join('/');
  const allPosts = await getAllFilesFrontMatter('blog');
  const postIndex = allPosts.findIndex(
    (post) => formatSlug(post.slug) === slug,
  );
  const prev: { slug: string; title: string } = allPosts[postIndex + 1] || null;
  const next: { slug: string; title: string } = allPosts[postIndex - 1] || null;
  const post = await getFileBySlug<PostFrontMatter>('blog', slug);
  // @ts-expect-error
  const authorList = post.frontMatter.authors || ['default'];
  const authorPromise = authorList.map(async (author) => {
    const authorResults = await getFileBySlug<AuthorFrontMatter>('authors', [
      author,
    ]);
    return authorResults.frontMatter;
  });
  const authorDetails = await Promise.all(authorPromise);

  const seriesNav = getSeriesNavigation(
    post.frontMatter as PostFrontMatter,
    allPosts,
  );

  // rss
  const rss = generateRss(allPosts);
  fs.writeFileSync('./public/feed.xml', rss);

  return {
    props: {
      post,
      authorDetails,
      prev,
      next,
      seriesData: seriesNav
        ? {
            prev: seriesNav.prev,
            next: seriesNav.next,
            series: {
              slug: seriesNav.series.slug,
              title: seriesNav.series.title,
              description: seriesNav.series.description,
              tags: seriesNav.series.tags,
              status: seriesNav.series.status,
              summary: seriesNav.series.summary,
            },
            allInSeries: seriesNav.allInSeries,
          }
        : null,
    },
  };
};

export default function Blog({
  post,
  authorDetails,
  prev,
  next,
  seriesData,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { mdxSource, toc, frontMatter } = post;

  return (
    <>
      {('draft' in frontMatter && frontMatter.draft !== true) ||
      show_drafts() ? (
        <MDXLayoutRenderer
          layout={frontMatter.layout || DEFAULT_LAYOUT}
          toc={toc}
          mdxSource={mdxSource}
          frontMatter={frontMatter}
          authorDetails={authorDetails}
          prev={prev}
          next={next}
          seriesData={seriesData}
        />
      ) : (
        <div className="mt-24 text-center">
          <PageTitle>
            Under Construction{' '}
            <span role="img" aria-label="roadwork sign">
              🚧
            </span>
          </PageTitle>
        </div>
      )}
    </>
  );
}
