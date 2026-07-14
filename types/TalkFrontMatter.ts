import type { FeaturedLink } from './Reference';

/**
 * One generated deck background (see components/graphics). Backgrounds are
 * defined once, named, and referenced by name — so multiple slides can share a
 * backdrop (which then stays fixed between them) or switch to a different one.
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
  /**
   * Optional link to a recording of the talk. A YouTube URL (watch / youtu.be /
   * live / shorts) renders as an inline player on the talk page; any other URL
   * renders as a "Watch Recording" link. See lib/utils/youtubeEmbed.ts.
   */
  videoUrl?: string;
  /**
   * Named background definitions. A slide picks one by name via a
   * `{/* bg: name *\/}` directive; `background` below is the deck-wide default.
   * The backdrop only transitions when the active slide's name changes.
   */
  backgrounds?: Record<string, TalkBackground>;
  /** Name of the default background (from `backgrounds`) applied to all slides. */
  background?: string;
  /**
   * Curated highlights boosted to a "Featured" group at the top of the deck's
   * Links section (durable replacement for a hand-written links slide). See
   * ADR-0007.
   */
  featuredLinks?: FeaturedLink[];
  /**
   * Deck colour theme. `dark` (default) is the brutalist neon-on-black deck;
   * `paper` renders a light ink-on-paper deck (matching the site's sketch
   * theme) with blue/red/green accents. Projection decks stay dark unless a
   * talk opts in.
   */
  deckTheme?: 'dark' | 'paper';
  slug: string;
};
