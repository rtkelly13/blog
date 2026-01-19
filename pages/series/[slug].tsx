import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
} from 'next';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import Tag from '@/components/Tag';
import siteMetadata from '@/data/siteMetadata';
import { getAllFilesFrontMatter } from '@/lib/mdx';
import { getAllSeries, getSeriesWithPosts } from '@/lib/series';
import formatDate from '@/lib/utils/formatDate';

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
  const series = getSeriesWithPosts(params?.slug as string, allPosts);

  if (!series) {
    return { notFound: true };
  }

  return { props: { series } };
};

export default function SeriesDetail({
  series,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <PageSEO
        title={`${series.title} - Series - ${siteMetadata.title}`}
        description={series.description}
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <div className="pt-6 pb-8 space-y-4 md:space-y-6 bg-zinc-900 px-6">
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`font-mono text-xs font-bold uppercase px-3 py-1 border-2 border-white ${
                series.status === 'completed'
                  ? 'bg-brutalist-cyan text-black'
                  : series.status === 'in-progress'
                    ? 'bg-brutalist-yellow text-black'
                    : 'bg-zinc-800 text-white'
              }`}
            >
              {series.status}
            </span>
            <span className="font-mono text-sm text-brutalist-yellow">
              {series.postCount} {series.postCount === 1 ? 'part' : 'parts'}
            </span>
          </div>
          <h1 className="text-3xl font-mono font-bold leading-9 tracking-tight text-white uppercase sm:text-4xl sm:leading-10 md:text-5xl md:leading-14 border-l-4 border-brutalist-cyan pl-6">
            {series.title}
          </h1>
          <p className="font-mono text-lg leading-7 text-gray-200 border-l-4 border-brutalist-pink pl-6">
            {series.description}
          </p>
          <div className="flex flex-wrap gap-2 pl-6">
            {series.tags.map((tag) => (
              <Tag key={tag} text={tag} />
            ))}
          </div>
        </div>

        <div className="py-12 px-6">
          <h2 className="font-mono text-xl font-bold uppercase text-white mb-6 border-l-4 border-brutalist-cyan pl-4">
            [ ALL_PARTS ]
          </h2>
          {series.posts.length === 0 ? (
            <p className="font-mono text-brutalist-pink text-center py-8">
              ERROR: No posts in this series yet.
            </p>
          ) : (
            <ol className="space-y-8">
              {series.posts.map((post) => (
                <li
                  key={post.slug}
                  className="hover:bg-zinc-900 transition-colors p-6 border-2 border-white"
                >
                  <div className="flex items-start gap-4">
                    <span className="font-mono text-2xl font-bold text-brutalist-cyan flex-shrink-0">
                      {String(post.order + 1).padStart(2, '0')}.
                    </span>
                    <div className="flex-1 space-y-2">
                      <h3 className="text-xl font-mono font-bold text-white uppercase">
                        <Link
                          href={`/blog/${post.slug}`}
                          className="hover:text-brutalist-cyan transition-colors"
                        >
                          {post.title}
                        </Link>
                      </h3>
                      {post.date && (
                        <p className="font-mono text-sm text-brutalist-yellow">
                          {formatDate(post.date)}
                        </p>
                      )}
                      {post.summary && (
                        <p className="font-mono text-sm text-gray-300">
                          {post.summary}
                        </p>
                      )}
                      <div>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="font-mono text-sm text-brutalist-cyan hover:text-brutalist-pink border-b-2 border-brutalist-cyan hover:border-brutalist-pink font-bold"
                        >
                          READ_POST &gt;&gt;
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="py-6 px-6 bg-zinc-900">
          <Link
            href="/series"
            className="font-mono text-sm text-brutalist-cyan hover:text-brutalist-pink border-b-2 border-brutalist-cyan hover:border-brutalist-pink font-bold"
          >
            &larr; BACK_TO_ALL_SERIES
          </Link>
        </div>
      </div>
    </>
  );
}
