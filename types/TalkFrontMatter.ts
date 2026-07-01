export type TalkFrontMatter = {
  title: string;
  date: string;
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
