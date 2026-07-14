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
