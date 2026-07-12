export type IdeaKind = 'article' | 'series';

export type IdeaStatus =
  | 'spark'
  | 'developing'
  | 'drafting'
  | 'published'
  | 'parked';

/**
 * Frontmatter for an idea file in `data/ideas/` — a future article or series
 * being evolved before any post draft exists. Ideas render only behind the
 * admin login (/ideas); they never appear in listings, feeds, search, or the
 * sitemap.
 */
export type IdeaFrontMatter = {
  title: string;
  kind: IdeaKind;
  status: IdeaStatus;
  summary?: string;
  tags?: string[];
  /** ISO dates — `updated` drives the workbench ordering. */
  created?: string;
  updated?: string;
  /** Where the work-in-progress lives (branch, file, PR) once one exists. */
  target?: string;
  layout?: string;
  slug: string;
  fileName: string;
};
