import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import Tag from '@/components/Tag';
import siteMetadata from '@/data/siteMetadata';
import { getAllFilesFrontMatter } from '@/lib/mdx';
import { getAllSeriesWithPosts } from '@/lib/series';
import formatDate from '@/lib/utils/formatDate';

export const getStaticProps: GetStaticProps = async () => {
  const allPosts = await getAllFilesFrontMatter('blog');
  const allSeries = getAllSeriesWithPosts(allPosts);

  return { props: { allSeries } };
};

export default function Series({
  allSeries,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <PageSEO
        title={`Series - ${siteMetadata.title}`}
        description="Blog post series and multi-part tutorials"
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <div className="pt-6 pb-8 space-y-4 md:space-y-6 bg-zinc-900 px-6">
          <h1 className="text-3xl font-mono font-bold leading-9 tracking-tight text-white uppercase sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 border-4 border-double border-brutalist-cyan inline-block px-8 py-4">
            &gt; SERIES
          </h1>
          <p className="font-mono text-lg leading-7 text-gray-200 border-l-4 border-brutalist-pink pl-4">
            <span className="text-brutalist-yellow">{'//'}</span> Multi-part
            blog series and tutorials
          </p>
        </div>

        <ul className="divide-y divide-white">
          {!allSeries.length && (
            <li className="py-8 px-6 font-mono text-brutalist-pink text-center">
              ERROR: No series found.
            </li>
          )}
          {allSeries.map((series) => (
            <li
              key={series.slug}
              className="py-12 px-6 hover:bg-zinc-900 transition-colors"
            >
              <article>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
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
                        {series.postCount}{' '}
                        {series.postCount === 1 ? 'part' : 'parts'}
                      </span>
                    </div>
                    <h2 className="text-2xl font-mono font-bold leading-8 tracking-tight uppercase border-l-4 border-brutalist-cyan pl-4">
                      <Link
                        href={`/series/${series.slug}`}
                        className="text-white hover:text-brutalist-cyan transition-colors"
                      >
                        [ {series.title} ]
                      </Link>
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-3 pl-4">
                      {series.tags.map((tag) => (
                        <Tag key={tag} text={tag} />
                      ))}
                    </div>
                  </div>
                  <div className="font-mono text-sm text-gray-200 pl-4">
                    {series.description}
                  </div>
                  {series.posts.length > 0 && (
                    <div className="pl-4">
                      <h3 className="font-mono text-xs uppercase text-brutalist-yellow tracking-wider mb-2">
                        Posts in Series:
                      </h3>
                      <ol className="space-y-1">
                        {series.posts.map((post) => (
                          <li
                            key={post.slug}
                            className="flex items-start gap-2"
                          >
                            <span className="font-mono text-xs text-brutalist-cyan font-bold mt-0.5">
                              {String(post.order + 1).padStart(2, '0')}.
                            </span>
                            <Link
                              href={`/blog/${post.slug}`}
                              className="font-mono text-sm text-gray-300 hover:text-brutalist-cyan transition-colors"
                            >
                              {post.title}
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <div className="font-mono text-base leading-6 pl-4">
                    <Link
                      href={`/series/${series.slug}`}
                      className="text-brutalist-cyan hover:text-brutalist-pink border-b-2 border-brutalist-cyan hover:border-brutalist-pink font-bold"
                      aria-label={`View series: ${series.title}`}
                    >
                      VIEW_SERIES &gt;&gt;
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
