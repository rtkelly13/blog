import { ChevronDown, ChevronRight } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import type { SeriesMetadata } from 'types/Series';
import Link from '@/components/Link';
import Pagination from '@/components/Pagination';
import formatDate from '@/lib/utils/formatDate';

interface Props {
  posts: PostFrontMatter[];
  title: string;
  initialDisplayPosts?: PostFrontMatter[];
  pagination?: ComponentProps<typeof Pagination>;
  seriesMap?: Map<string, SeriesMetadata>;
  tagCounts?: Record<string, number>;
}

type SeriesGroup = {
  name: string;
  slug?: string;
  posts: PostFrontMatter[];
  latestDate: string;
  series?: SeriesMetadata;
  tags: string[];
};

type PostOrGroup =
  | { type: 'post'; post: PostFrontMatter }
  | { type: 'series'; group: SeriesGroup };

function sortTagsByPopularity(
  tags: string[],
  tagCounts: Record<string, number> = {},
): string[] {
  return [...tags].sort((a, b) => {
    const countA = tagCounts[a.toLowerCase()] || 0;
    const countB = tagCounts[b.toLowerCase()] || 0;
    return countB - countA;
  });
}

function mergeUniqueTags(seriesTags: string[], postTags: string[]): string[] {
  const seen = new Set(seriesTags.map((t) => t.toLowerCase()));
  const result = [...seriesTags];

  for (const tag of postTags) {
    if (!seen.has(tag.toLowerCase())) {
      result.push(tag);
      seen.add(tag.toLowerCase());
    }
  }

  return result;
}

function groupContiguousSeriesPosts(
  posts: PostFrontMatter[],
  seriesMap?: Map<string, SeriesMetadata>,
): PostOrGroup[] {
  const result: PostOrGroup[] = [];
  let i = 0;

  while (i < posts.length) {
    const currentPost = posts[i];

    if (!currentPost.series) {
      result.push({ type: 'post', post: currentPost });
      i++;
      continue;
    }

    const seriesName = currentPost.series.name;
    const seriesPosts: PostFrontMatter[] = [currentPost];
    let j = i + 1;

    while (j < posts.length && posts[j].series?.name === seriesName) {
      seriesPosts.push(posts[j]);
      j++;
    }

    const latestDate = seriesPosts.reduce(
      (latest, post) => (post.date > latest ? post.date : latest),
      seriesPosts[0].date,
    );

    const seriesMeta = seriesMap?.get(seriesName);
    const seriesTags = seriesMeta?.tags || [];

    const allPostTags = seriesPosts.flatMap((p) => p.tags);
    const uniqueTags = mergeUniqueTags(seriesTags, allPostTags);

    result.push({
      type: 'series',
      group: {
        name: seriesName,
        slug: seriesMeta?.slug,
        posts: seriesPosts.sort(
          (a, b) => (a.series?.order ?? 0) - (b.series?.order ?? 0),
        ),
        latestDate,
        series: seriesMeta,
        tags: uniqueTags,
      },
    });

    i = j;
  }

  return result;
}

export default function ListLayout({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
  seriesMap,
  tagCounts = {},
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

  const groupedPosts = groupContiguousSeriesPosts(displayPosts, seriesMap);

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

  const renderTags = (tags: string[], maxVisible = 5) => {
    const sortedTags = sortTagsByPopularity(tags, tagCounts);
    const visibleTags = sortedTags.slice(0, maxVisible);
    const hiddenCount = sortedTags.length - maxVisible;

    return (
      <div className="flex flex-wrap gap-2 mt-3 mb-2">
        {visibleTags.map((tag) => (
          <Link
            key={tag}
            href={`/tags/${tag.toLowerCase().replace(/ /g, '-')}`}
            className="text-xs font-mono font-bold bg-brutalist-yellow text-black px-2 py-1 uppercase"
          >
            #{tag}
          </Link>
        ))}
        {hiddenCount > 0 && (
          <span className="inline-block px-2 py-1 font-mono text-xs text-gray-400 border border-gray-600">
            +{hiddenCount} more
          </span>
        )}
      </div>
    );
  };

  const renderPost = (frontMatter: PostFrontMatter, isInSeries = false) => {
    const { slug, date, title, summary, tags, readingTime } = frontMatter;

    return (
      <li
        key={slug}
        className={`my-6 rounded-md border-2 border-brutalist-cyan bg-black/80 shadow-glow-cyan transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.7),0_0_30px_rgba(34,211,238,0.5)] ${
          isInSeries ? 'ml-6 border-l-4 border-l-brutalist-pink' : ''
        }`}
      >
        <article className="space-y-2 p-5">
          <div className="font-mono text-sm leading-6 text-brutalist-cyberOrange flex items-center gap-2">
            <div>
              <span className="text-brutalist-cyberOrange font-bold">&gt;</span>{' '}
              <time dateTime={date}>{formatDate(date)}</time>
            </div>
            {readingTime && (
              <>
                <span className="text-white opacity-50">||</span>
                <span className="text-gray-300">{readingTime.text}</span>
              </>
            )}
          </div>
          <div>
            {isInSeries && frontMatter.series && (
              <div className="font-mono text-xs text-brutalist-pink mb-1">
                Part {frontMatter.series.order}
              </div>
            )}
            <h3 className="text-2xl font-mono font-bold leading-8 tracking-tight uppercase">
              <Link
                href={`/blog/${slug}`}
                className="text-white hover:text-brutalist-cyan transition-colors"
              >
                [ {title} ]
              </Link>
            </h3>
            {renderTags(tags)}
          </div>
          <div className="font-mono text-sm text-gray-300">{summary}</div>
          <div className="font-mono text-sm pt-2 text-right">
            <Link
              href={`/blog/${slug}`}
              className="text-brutalist-cyan hover:text-brutalist-pink font-bold inline-flex items-center gap-1"
            >
              READ_MORE &gt;&gt;
            </Link>
          </div>
        </article>
      </li>
    );
  };

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0">
        <div className="pt-6 pb-8 space-y-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-pixel font-bold leading-9 tracking-widest text-white uppercase sm:text-5xl sm:leading-10 md:text-7xl md:leading-14 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] pb-4 inline-block relative">
              [ {title} ]
              <div className="absolute bottom-0 left-0 w-full h-[4px] bg-brutalist-cyan shadow-glow-cyan" />
            </h1>
          </div>
          <div className="relative max-w-full mx-auto">
            <span className="absolute left-4 top-3.5 font-mono text-brutalist-cyan font-bold">
              &gt;
            </span>
            <input
              aria-label="Search articles"
              type="text"
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="search_articles...|"
              className="block w-full pl-10 pr-12 py-3 rounded-md font-mono text-white bg-black/50 border-2 border-brutalist-cyan focus:ring-2 focus:ring-brutalist-cyan focus:border-brutalist-cyan placeholder-gray-500 shadow-glow-cyan"
            />
            <svg
              className="absolute w-5 h-5 text-gray-400 right-4 top-4"
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
        <ul className="space-y-6">
          {!filteredBlogPosts.length && (
            <li className="py-8 px-6 font-mono text-brutalist-pink text-center border-2 border-brutalist-pink rounded-md bg-black/80 shadow-glow-pink">
              &gt; ERROR: No posts found.
            </li>
          )}

          {groupedPosts.map((item, idx) => {
            if (item.type === 'post') {
              return renderPost(item.post);
            }

            const seriesGroup = item.group;
            const isExpanded = expandedSeries.has(seriesGroup.name);

            return (
              <li
                key={`series-${seriesGroup.name}-${idx}`}
                className="my-6 rounded-md border-2 border-brutalist-pink bg-black/80 shadow-[0_0_10px_rgba(236,72,153,0.5),0_0_20px_rgba(236,72,153,0.3)] transition-all"
              >
                <article className="space-y-2 p-5">
                  <div className="font-mono text-sm leading-6 text-brutalist-cyberOrange flex items-center gap-2">
                    <div>
                      <span className="text-brutalist-cyberOrange font-bold">&gt;</span>{' '}
                      <time dateTime={seriesGroup.latestDate}>
                        {formatDate(seriesGroup.latestDate)}
                      </time>
                    </div>
                    <div>
                      <span className="text-white opacity-50">||</span>{' '}
                      <span className="text-gray-300">
                        {seriesGroup.posts.length} part
                        {seriesGroup.posts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-block bg-brutalist-pink text-black font-mono font-bold text-xs px-2 py-1 uppercase">
                        SERIES
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSeries(seriesGroup.name)}
                        className="text-brutalist-pink hover:text-white transition-colors font-mono font-bold text-xs uppercase flex items-center gap-1"
                        aria-expanded={isExpanded}
                        aria-label={
                          isExpanded ? 'Collapse series' : 'Expand series'
                        }
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            <span>COLLAPSE</span>
                          </>
                        ) : (
                          <>
                            <ChevronRight className="w-4 h-4" />
                            <span>EXPAND</span>
                          </>
                        )}
                      </button>
                    </div>
                    <h3 className="text-2xl font-mono font-bold leading-8 tracking-tight uppercase">
                      {seriesGroup.slug ? (
                        <Link
                          href={`/series/${seriesGroup.slug}`}
                          className="text-white hover:text-brutalist-pink transition-colors"
                        >
                          [ {seriesGroup.name} ]
                        </Link>
                      ) : (
                        <span className="text-white">
                          [ {seriesGroup.name} ]
                        </span>
                      )}
                    </h3>
                    {renderTags(seriesGroup.tags)}
                  </div>
                  {seriesGroup.series?.summary && (
                    <div className="font-mono text-sm text-gray-300">
                      {seriesGroup.series.summary}
                    </div>
                  )}
                  {seriesGroup.slug && (
                    <div className="font-mono text-sm pt-2 text-right">
                      <Link
                        href={`/series/${seriesGroup.slug}`}
                        className="text-brutalist-pink hover:text-white font-bold inline-flex items-center gap-1"
                      >
                        VIEW_SERIES &gt;&gt;
                      </Link>
                    </div>
                  )}
                </article>

                {isExpanded && (
                  <div className="mt-2 border-t border-brutalist-pink/30 p-5 bg-black/40">
                    <ul className="space-y-4">
                      {seriesGroup.posts.map((post) => renderPost(post, true))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {pagination && pagination.totalPages > 1 && !searchValue && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0 mt-8">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
          />
        </div>
      )}
    </>
  );
}
