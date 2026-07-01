export type TalkFrontMatter = {
  title: string;
  /** ISO date string, or null when the talk omits a date. */
  date: string | null;
  event: string;
  location?: string;
  audience?: string;
  summary: string;
  tags: string[];
  draft?: boolean;
  durationMins?: number;
  /** Optional path to a pre-rendered PDF in /public (overrides the print export). */
  pdf?: string;
  /** Optional link to a recording of the talk. */
  videoUrl?: string;
  slug: string;
};
