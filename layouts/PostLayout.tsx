import NextImage from 'next/image';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { AuthorFrontMatter } from 'types/AuthorFrontMatter';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import type { Toc } from 'types/Toc';
import BlogActions from '@/components/BlogActions';
import Comments from '@/components/comments';
import Link from '@/components/Link';
import NewsletterForm from '@/components/NewsletterForm';
import PageTitle from '@/components/PageTitle';
import { BlogSEO } from '@/components/SEO';
import SectionContainer from '@/components/SectionContainer';
import SeriesNavigation from '@/components/SeriesNavigation';
import Tag from '@/components/Tag';
import siteMetadata from '@/data/siteMetadata';

const editUrl = (fileName) =>
  `${siteMetadata.siteRepo}/blob/master/data/blog/${fileName}`;
const discussUrl = (slug) =>
  `https://mobile.twitter.com/search?q=${encodeURIComponent(
    `${siteMetadata.siteUrl}/blog/${slug}`,
  )}`;

const postDateTemplate: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
};

interface Props {
  frontMatter: PostFrontMatter;
  authorDetails: AuthorFrontMatter[];
  next?: { slug: string; title: string };
  prev?: { slug: string; title: string };
  children: ReactNode;
  toc?: Toc;
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
}

export default function PostLayout({
  frontMatter,
  authorDetails,
  next,
  prev,
  children,
  toc,
  seriesData,
}: Props) {
  const { slug, fileName, date, title, tags } = frontMatter;
  const [activeId, setActiveId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!toc || toc.length === 0) return;

    const headingIds = toc.map((item) => item.url.slice(1));
    const headingElements = headingIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (headingElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      {
        rootMargin: '0px 0px -80% 0px',
        threshold: 0,
      },
    );

    for (const element of headingElements) {
      observer.observe(element);
    }

    return () => {
      for (const element of headingElements) {
        observer.unobserve(element);
      }
    };
  }, [toc]);

  return (
    <SectionContainer>
      <BlogSEO
        url={`${siteMetadata.siteUrl}/blog/${slug}`}
        authorDetails={authorDetails}
        {...frontMatter}
      />
      <article>
        <div className="xl:divide-y xl:divide-gray-200 xl:dark:divide-gray-700">
          <header className="pt-6 xl:pb-6">
            <div className="space-y-1 text-center">
              <dl className="space-y-10">
                <div>
                  <dt className="sr-only">Published on</dt>
                  <dd className="text-base font-medium leading-6 text-gray-500 dark:text-gray-400">
                    <time dateTime={date}>
                      {new Date(date).toLocaleDateString(
                        siteMetadata.locale,
                        postDateTemplate,
                      )}
                    </time>
                  </dd>
                </div>
              </dl>
              <div>
                <PageTitle>{title}</PageTitle>
              </div>
            </div>
          </header>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <dl className="pt-6 pb-10">
              <dt className="sr-only">Authors</dt>
              <dd>
                <ul className="flex justify-center space-x-8 sm:space-x-12">
                  {authorDetails.map((author) => (
                    <li
                      className="flex items-center space-x-2"
                      key={author.name}
                    >
                      {author.avatar && (
                        <NextImage
                          src={author.avatar}
                          width={38}
                          height={38}
                          alt="avatar"
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <dl className="text-sm font-medium leading-5 whitespace-nowrap">
                        <dt className="sr-only">Name</dt>
                        <dd className="text-gray-900 dark:text-gray-100">
                          {author.name}
                        </dd>
                        <dt className="sr-only">Twitter</dt>
                        <dd>
                          {author.twitter && (
                            <Link
                              href={author.twitter}
                              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                            >
                              {author.twitter.replace(
                                'https://twitter.com/',
                                '@',
                              )}
                            </Link>
                          )}
                        </dd>
                      </dl>
                    </li>
                  ))}
                </ul>
              </dd>
            </dl>

            <div className="pt-10 pb-8 prose dark:prose-dark max-w-none">
              {children}
            </div>

            {seriesData && (
              <SeriesNavigation
                series={seriesData.series}
                allInSeries={seriesData.allInSeries}
                currentSlug={slug}
                prev={seriesData.prev}
                next={seriesData.next}
              />
            )}

            <div className="pt-6 pb-6 text-sm text-gray-700 dark:text-gray-300">
              <Link href={discussUrl(slug)} rel="nofollow">
                {'Discuss on Twitter'}
              </Link>
              {` • `}
              <Link href={editUrl(fileName)}>{'View on GitHub'}</Link>
            </div>

            {siteMetadata.newsletter?.enabled && (
              <div className="pt-6 pb-6">
                <NewsletterForm />
              </div>
            )}

            <Comments frontMatter={frontMatter} />

            <footer className="pt-6 pb-6">
              {tags && (
                <div className="py-4">
                  <h2 className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400 mb-3">
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Tag key={tag} text={tag} />
                    ))}
                  </div>
                </div>
              )}

              {(next || prev) && (
                <div className="flex justify-between py-4 space-x-4">
                  {prev ? (
                    <div className="flex-1">
                      <h2 className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400 mb-2">
                        Previous Article
                      </h2>
                      <div className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400">
                        <Link href={`/blog/${prev.slug}`}>{prev.title}</Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                  {next && (
                    <div className="flex-1 text-right">
                      <h2 className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400 mb-2">
                        Next Article
                      </h2>
                      <div className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400">
                        <Link href={`/blog/${next.slug}`}>{next.title}</Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4">
                <Link
                  href="/blog"
                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  &larr; Back to the blog
                </Link>
              </div>
            </footer>
          </div>
        </div>
      </article>
      <BlogActions toc={toc} activeId={activeId} />
    </SectionContainer>
  );
}
