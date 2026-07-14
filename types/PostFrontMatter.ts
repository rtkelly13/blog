import type { FeaturedLink } from './Reference';

export type PostFrontMatter = {
  title: string;
  date: string;
  tags: string[];
  lastmod?: string;
  draft?: boolean;
  summary?: string;
  tldr?: string;
  images?: string[];
  authors?: string[];
  layout?: string;
  /**
   * Curated highlights boosted to a "Featured" group at the top of the auto
   * References section — the durable replacement for a hand-written links
   * list. Cited links are matched by URL; uncited ones are added. See ADR-0007.
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
  /**
   * Bibliography file (.bib or CSL-JSON) relative to data/, e.g.
   * "references-data.bib". Enables [@BibKey] citations via rehype-citation;
   * a bibliography section is appended to the post.
   */
  bibliography?: string;
};
