import type { FeaturedLink } from './Reference';

export type PostFrontMatter = {
  title: string;
  date: string;
  tags: string[];
  lastmod?: string;
  draft?: boolean;
  summary?: string;
  images?: string[];
  authors?: string[];
  layout?: string;
  /**
   * Curated highlights boosted to a "Featured" group at the top of the auto
   * References section — the durable replacement for a hand-written links
   * list. Cited links are matched by URL; uncited ones are added. See ADR-0006.
   */
  featuredLinks?: FeaturedLink[];
  slug: string;
  fileName: string;
  readingTime?: {
    text: string;
    minutes: number;
    time: number;
    words: number;
  };
  series?: {
    name: string;
    order: number;
  };
};
