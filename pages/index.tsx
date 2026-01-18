import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import Link from '@/components/Link';
import MountainHero from '@/components/MountainHero';
import { PageSEO } from '@/components/SEO';
import Tag from '@/components/Tag';
import siteMetadata from '@/data/siteMetadata';
import { getAllFilesFrontMatter } from '@/lib/mdx';
import formatDate from '@/lib/utils/formatDate';

const MAX_DISPLAY = 5;

export const getStaticProps: GetStaticProps<{
  posts: PostFrontMatter[];
}> = async () => {
  const posts = await getAllFilesFrontMatter('blog');

  return { props: { posts } };
};

export default function Home({
  posts,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <PageSEO
        title={siteMetadata.title}
        description={siteMetadata.description}
      />
      <MountainHero />
      <div className="divide-y divide-white border-2 border-white bg-black mt-12">
        <div className="pt-6 pb-8 space-y-4 md:space-y-6 bg-zinc-900 px-6">
          <h1 className="text-3xl font-mono font-bold leading-9 tracking-tight text-white uppercase sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 border-4 border-double border-brutalist-cyan inline-block px-8 py-4">
            &gt; LATEST_POSTS
          </h1>
          <p className="font-mono text-lg leading-7 text-gray-200 border-l-4 border-brutalist-pink pl-4">
            <span className="text-brutalist-yellow">{'//'}</span>{' '}
            {siteMetadata.description}
          </p>
        </div>
        <ul className="divide-y divide-white">
          {!posts.length && (
            <li className="py-8 px-6 font-mono text-brutalist-pink text-center">
              ERROR: No posts found.
            </li>
          )}
          {posts.slice(0, MAX_DISPLAY).map((frontMatter) => {
            const { slug, date, title, summary, tags } = frontMatter;
            return (
              <li
                key={slug}
                className="py-12 px-6 hover:bg-zinc-900 transition-colors"
              >
                <article>
                  <div className="space-y-4 xl:grid xl:grid-cols-4 xl:space-y-0 xl:items-baseline xl:gap-x-6">
                    <dl>
                      <dt className="sr-only">Published on</dt>
                      <dd className="font-mono text-base leading-6 text-brutalist-yellow">
                        <span className="text-brutalist-cyan font-bold">
                          &gt;
                        </span>{' '}
                        <time dateTime={date}>{formatDate(date)}</time>
                      </dd>
                    </dl>
                    <div className="space-y-5 xl:col-span-3">
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-2xl font-mono font-bold leading-8 tracking-tight uppercase border-l-4 border-brutalist-cyan pl-4">
                            <Link
                              href={`/blog/${slug}`}
                              className="text-white hover:text-brutalist-cyan transition-colors"
                            >
                              [ {title} ]
                            </Link>
                          </h2>
                          <div className="flex flex-wrap gap-2 mt-3 pl-4">
                            {tags.map((tag) => (
                              <Tag key={tag} text={tag} />
                            ))}
                          </div>
                        </div>
                        <div className="font-mono text-sm text-gray-200 pl-4">
                          {summary}
                        </div>
                      </div>
                      <div className="font-mono text-base leading-6 pl-4">
                        <Link
                          href={`/blog/${slug}`}
                          className="text-brutalist-cyan hover:text-brutalist-pink border-b-2 border-brutalist-cyan hover:border-brutalist-pink font-bold"
                          aria-label={`Read "${title}"`}
                        >
                          READ_MORE &gt;&gt;
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
      {posts.length > MAX_DISPLAY && (
        <div className="flex justify-end font-mono text-base leading-6 mt-6">
          <Link
            href="/blog"
            className="text-brutalist-cyan hover:text-brutalist-pink border-2 border-brutalist-cyan hover:border-brutalist-pink px-6 py-3 font-bold uppercase shadow-hard-cyan hover:shadow-hard-pink transition-all"
            aria-label="all posts"
          >
            [ VIEW_ALL_POSTS ]
          </Link>
        </div>
      )}
    </>
  );
}
