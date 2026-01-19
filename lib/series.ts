import fs from 'node:fs';
import path from 'node:path';
import type { PostFrontMatter } from '../types/PostFrontMatter';
import type { SeriesMetadata, SeriesWithPosts } from '../types/Series';

const root = process.cwd();
const seriesPath = path.join(root, 'data', 'series');

/**
 * Get all series metadata
 */
export function getAllSeries(): SeriesMetadata[] {
  if (!fs.existsSync(seriesPath)) {
    return [];
  }

  const files = fs.readdirSync(seriesPath);
  const allSeries: SeriesMetadata[] = [];

  for (const file of files) {
    if (path.extname(file) !== '.json') continue;

    const filePath = path.join(seriesPath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const series = JSON.parse(content) as SeriesMetadata;
    allSeries.push(series);
  }

  return allSeries.sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return dateB - dateA; // Most recent first
  });
}

/**
 * Get series metadata by slug
 */
export function getSeriesBySlug(slug: string): SeriesMetadata | null {
  const filePath = path.join(seriesPath, `${slug}.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content) as SeriesMetadata;
}

/**
 * Get series metadata by name
 */
export function getSeriesByName(name: string): SeriesMetadata | null {
  const allSeries = getAllSeries();
  return allSeries.find((series) => series.title === name) || null;
}

/**
 * Get series with all its posts
 */
export function getSeriesWithPosts(
  slug: string,
  allPosts: PostFrontMatter[],
): SeriesWithPosts | null {
  const series = getSeriesBySlug(slug);
  if (!series) return null;

  const seriesPosts = allPosts
    .filter((post) => post.series?.name === series.title)
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      summary: post.summary,
      order: post.series?.order ?? 0,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    ...series,
    posts: seriesPosts,
    postCount: seriesPosts.length,
  };
}

/**
 * Get all series with their posts
 */
export function getAllSeriesWithPosts(
  allPosts: PostFrontMatter[],
): SeriesWithPosts[] {
  const allSeries = getAllSeries();
  return allSeries
    .map((series) => getSeriesWithPosts(series.slug, allPosts))
    .filter((series): series is SeriesWithPosts => series !== null);
}

/**
 * Get navigation data for a post in a series (prev/next within series)
 */
export function getSeriesNavigation(
  currentPost: PostFrontMatter,
  allPosts: PostFrontMatter[],
): {
  prev: { slug: string; title: string; order: number } | null;
  next: { slug: string; title: string; order: number } | null;
  series: SeriesMetadata | null;
  allInSeries: { slug: string; title: string; order: number }[];
} | null {
  if (!currentPost.series) return null;

  const series = getSeriesByName(currentPost.series.name);
  if (!series) return null;

  const seriesPosts = allPosts
    .filter((post) => post.series?.name === currentPost.series?.name)
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      order: post.series?.order ?? 0,
    }))
    .sort((a, b) => a.order - b.order);

  const currentIndex = seriesPosts.findIndex(
    (post) => post.slug === currentPost.slug,
  );

  return {
    prev: currentIndex > 0 ? seriesPosts[currentIndex - 1] : null,
    next:
      currentIndex < seriesPosts.length - 1
        ? seriesPosts[currentIndex + 1]
        : null,
    series,
    allInSeries: seriesPosts,
  };
}
