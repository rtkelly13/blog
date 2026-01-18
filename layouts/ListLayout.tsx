import { ChevronDown, ChevronRight } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import Link from '@/components/Link';
import Pagination from '@/components/Pagination';
import Tag from '@/components/Tag';
import formatDate from '@/lib/utils/formatDate';

interface Props {
  posts: PostFrontMatter[];
  title: string;
  initialDisplayPosts?: PostFrontMatter[];
  pagination?: ComponentProps<typeof Pagination>;
}

type SeriesGroup = {
  name: string;
  posts: PostFrontMatter[];
  latestDate: string;
};

function groupPostsBySeries(posts: PostFrontMatter[]): {
  series: SeriesGroup[];
  standalone: PostFrontMatter[];
} {
  const seriesMap = new Map<string, PostFrontMatter[]>();
  const standalone: PostFrontMatter[] = [];

  for (const post of posts) {
    if (post.series) {
      const existing = seriesMap.get(post.series.name) || [];
      existing.push(post);
      seriesMap.set(post.series.name, existing);
    } else {
      standalone.push(post);
    }
  }

  const series: SeriesGroup[] = [];

  for (const [name, seriesPosts] of seriesMap.entries()) {
    const sortedPosts = seriesPosts.sort((a, b) => {
      if (a.series && b.series) {
        return a.series.order - b.series.order;
      }
      return 0;
    });

    const latestDate = sortedPosts.reduce(
      (latest, post) => (post.date > latest ? post.date : latest),
      sortedPosts[0].date,
    );

    series.push({
      name,
      posts: sortedPosts,
      latestDate,
    });
  }

  series.sort((a, b) => (a.latestDate > b.latestDate ? -1 : 1));

  return { series, standalone };
}

export default function ListLayout({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}: Props) {
  const [searchValue, setSearchValue] = useState('');
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());

  const filteredBlogPosts = posts.filter((frontMatter) => {
    const searchContent =
      frontMatter.title + frontMatter.summary + frontMatter.tags.join(' ');
    return searchContent.toLowerCase().includes(searchValue.toLowerCase());
  });

  const displayPosts =
    initialDisplayPosts.length > 0 && !searchValue
      ? initialDisplayPosts
      : filteredBlogPosts;

  const { series, standalone } = groupPostsBySeries(displayPosts);

  const toggleSeries = (seriesName: string) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(seriesName)) {
        next.delete(seriesName);
      } else {
        next.add(seriesName);
      }
      return next;
    });
  };

  const renderPost = (frontMatter: PostFrontMatter, isInSeries = false) => {
    const { slug, date, title, summary, tags, readingTime } = frontMatter;
    return (
      <li
        key={slug}
        className={`py-6 border-b-2 border-white last:border-b-0 hover:bg-zinc-900 transition-colors ${
          isInSeries ? 'pl-6' : ''
        }`}
      >
        <article className="space-y-2 xl:grid xl:grid-cols-4 xl:space-y-0 xl:items-baseline px-6">
          <dl>
            <dt className="sr-only">Published on</dt>
            <dd className="font-mono text-sm leading-6 text-brutalist-yellow">
              <span className="text-brutalist-cyan">&gt;</span>{' '}
              <time dateTime={date}>{formatDate(date)}</time>
              {readingTime && (
                <>
                  {' '}
                  <span className="text-brutalist-cyan">||</span>{' '}
                  <span className="text-white">{readingTime.text}</span>
                </>
              )}
            </dd>
          </dl>
          <div className="space-y-3 xl:col-span-3">
            <div>
              <h3 className="text-2xl font-mono font-bold leading-8 tracking-tight uppercase">
                <Link
                  href={`/blog/${slug}`}
                  className="text-white hover:text-brutalist-cyan transition-colors"
                >
                  [ {title} ]
                </Link>
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Tag key={tag} text={tag} />
                ))}
              </div>
            </div>
            <div className="font-mono text-sm text-gray-200">{summary}</div>
            <div className="font-mono text-sm">
              <Link
                href={`/blog/${slug}`}
                className="text-brutalist-cyan hover:text-brutalist-pink border-b-2 border-brutalist-cyan hover:border-brutalist-pink font-bold"
              >
                READ_MORE &gt;&gt;
              </Link>
            </div>
          </div>
        </article>
      </li>
    );
  };

  return (
    <>
      <div className="divide-y divide-white border-2 border-white bg-black">
        <div className="pt-6 pb-8 space-y-4 md:space-y-6 bg-zinc-900 px-6">
          <h1 className="text-3xl font-mono font-bold leading-9 tracking-tight text-white uppercase sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 border-b-4 border-double border-brutalist-cyan pb-4">
            [ {title} ]
          </h1>
          <div className="relative max-w-lg">
            <span className="absolute left-3 top-3 font-mono text-brutalist-cyan font-bold">
              &gt;
            </span>
            <input
              aria-label="Search articles"
              type="text"
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="search_articles..."
              className="block w-full pl-8 pr-4 py-3 font-mono text-white bg-black border-2 border-white focus:ring-2 focus:ring-brutalist-cyan focus:border-brutalist-cyan placeholder-gray-500"
            />
            <svg
              className="absolute w-5 h-5 text-brutalist-yellow right-3 top-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <ul>
          {!filteredBlogPosts.length && (
            <li className="py-8 px-6 font-mono text-brutalist-pink text-center">
              ERROR: No posts found.
            </li>
          )}

          {series.map((seriesGroup) => {
            const isExpanded = expandedSeries.has(seriesGroup.name);
            const indexPost = seriesGroup.posts.find(
              (p) => p.series?.order === 0,
            );
            const _parts = seriesGroup.posts.filter(
              (p) => p.series && p.series.order > 0,
            );

            return (
              <li
                key={seriesGroup.name}
                className="border-b-2 border-white last:border-b-0"
              >
                <button
                  type="button"
                  className="w-full py-6 px-6 hover:bg-zinc-900 transition-colors bg-zinc-950 text-left"
                  onClick={() => toggleSeries(seriesGroup.name)}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-brutalist-cyan flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-brutalist-cyan flex-shrink-0" />
                        )}
                        <h2 className="text-2xl font-mono font-bold uppercase text-white">
                          [ SERIES: {seriesGroup.name} ]
                        </h2>
                      </div>
                      <div className="pl-7">
                        <p className="font-mono text-sm text-brutalist-yellow">
                          <span className="text-brutalist-cyan">&gt;</span>{' '}
                          {formatDate(seriesGroup.latestDate)} |{' '}
                          {seriesGroup.posts.length} part
                          {seriesGroup.posts.length > 1 ? 's' : ''}
                        </p>
                        {indexPost && (
                          <p className="font-mono text-sm text-gray-200 mt-2">
                            {indexPost.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <ul className="bg-black">
                    {seriesGroup.posts.map((post) => renderPost(post, true))}
                  </ul>
                )}
              </li>
            );
          })}

          {standalone.map((post) => renderPost(post))}
        </ul>
      </div>
      {pagination && pagination.totalPages > 1 && !searchValue && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
        />
      )}
    </>
  );
}
