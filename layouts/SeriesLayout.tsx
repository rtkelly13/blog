import type { ReactNode } from 'react';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import Link from '@/components/Link';
import PageTitle from '@/components/PageTitle';
import { PageSEO } from '@/components/SEO';
import SectionContainer from '@/components/SectionContainer';
import Tag from '@/components/Tag';

const statusColors = {
  planned: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  'in-progress':
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  completed:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
};

interface SeriesFrontMatter {
  title: string;
  slug: string;
  description: string;
  tags: string[];
  image?: string;
  status: 'planned' | 'in-progress' | 'completed';
  startDate: string;
  endDate?: string;
  summary: string;
}

interface Props {
  frontMatter: SeriesFrontMatter;
  children: ReactNode;
  posts: PostFrontMatter[];
}

export default function SeriesLayout({ frontMatter, children, posts }: Props) {
  const { title, slug, description, tags, status, startDate, endDate } =
    frontMatter;

  return (
    <SectionContainer>
      <PageSEO title={`${title} - Series`} description={description} />
      <article>
        <div className="xl:divide-y xl:divide-gray-200 xl:dark:divide-gray-700">
          <header className="pt-6 xl:pb-6">
            <div className="space-y-1 text-center">
              <div className="mb-4">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase ${statusColors[status]}`}
                >
                  {status.replace('-', ' ')}
                </span>
              </div>
              <PageTitle>{title}</PageTitle>
              <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
                {description}
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-4">
                {tags.map((tag) => (
                  <Tag key={tag} text={tag} />
                ))}
              </div>
              <dl className="pt-4 text-sm text-gray-500 dark:text-gray-400">
                <div>
                  <dt className="sr-only">Started</dt>
                  <dd className="font-medium">
                    Started{' '}
                    {new Date(startDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {endDate &&
                      ` • Completed ${new Date(endDate).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        },
                      )}`}
                  </dd>
                </div>
              </dl>
            </div>
          </header>
          <div
            className="divide-y divide-gray-200 pb-8 dark:divide-gray-700 xl:grid xl:grid-cols-4 xl:gap-x-6 xl:divide-y-0"
            style={{ gridTemplateRows: 'auto 1fr' }}
          >
            <div className="divide-y divide-gray-200 dark:divide-gray-700 xl:col-span-3 xl:row-span-2 xl:pb-0">
              <div className="prose max-w-none pb-8 pt-10 dark:prose-dark">
                {children}
              </div>

              {posts.length > 0 && (
                <div className="border-t-4 border-cyan-400 pt-8">
                  <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                    Posts in This Series
                  </h2>
                  <ul className="space-y-4">
                    {posts.map((post) => (
                      <li key={post.slug} className="group">
                        <Link
                          href={`/blog/${post.slug}`}
                          className="block rounded border-2 border-gray-200 p-4 transition-all hover:border-cyan-400 hover:shadow-[4px_4px_0px_0px_rgba(34,211,238,1)] dark:border-gray-700 dark:hover:border-cyan-400"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-gray-900 group-hover:text-cyan-600 dark:text-gray-100 dark:group-hover:text-cyan-400">
                                {post.series?.order && (
                                  <span className="mr-2 text-cyan-600 dark:text-cyan-400">
                                    Part {post.series.order}:
                                  </span>
                                )}
                                {post.title}
                              </h3>
                              {post.summary && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                  {post.summary}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {post.tags?.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs text-gray-500 dark:text-gray-400"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <time className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(post.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </time>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </SectionContainer>
  );
}
