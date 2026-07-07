/**
 * Optional generated deck background (see components/graphics). Renders behind
 * every slide via a data-URI SVG, keyed to the talk's signature accent.
 */
export type TalkBackground = {
  /** Generator id from the graphics registry (e.g. `node-network`). */
  generator: string;
  seed?: number;
  /** Hex accent; defaults to the generator's own default when omitted. */
  accent?: string;
  /** 0..1 overall opacity — keep low so slide content stays legible. */
  opacity?: number;
  density?: number;
};

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
  /** Optional generated deck background. */
  background?: TalkBackground;
  slug: string;
};
