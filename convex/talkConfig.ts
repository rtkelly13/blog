import { v } from 'convex/values';

/**
 * Per-talk feature config, set by the presenter at start time and stored on the
 * talk row. Every live surface (/live, the deck follow, the closing chart) reads
 * it, and the audience Convex functions enforce it server-side — a disabled
 * feature isn't just hidden, its writes are dropped. See convex/talks.ts.
 */
export const talkConfigValidator = v.object({
  /** Live head-count (presence heartbeats). */
  presence: v.boolean(),
  /** Emoji reaction chat. */
  reactions: v.boolean(),
  /** Reveal the closing stats chart (once reactions ≥ chartThreshold). */
  closingChart: v.boolean(),
  /** Reactions needed before the closing chart reveals. */
  chartThreshold: v.number(),
  /** Follow-the-presenter: audience decks mirror the presenter's slide. */
  follow: v.boolean(),
});

export type TalkConfig = {
  presence: boolean;
  reactions: boolean;
  closingChart: boolean;
  chartThreshold: number;
  follow: boolean;
};

/** Applied to any talk missing a config (e.g. started before configs existed). */
export const DEFAULT_CONFIG: TalkConfig = {
  presence: true,
  reactions: true,
  closingChart: true,
  chartThreshold: 3,
  follow: false,
};

/**
 * Presets the presenter picks from on /live/manage; each is a starting point
 * they can then override with individual toggles before hitting Start.
 */
export const TALK_PRESETS: { id: string; label: string; config: TalkConfig }[] =
  [
    {
      id: 'interactive',
      label: 'Interactive',
      config: {
        presence: true,
        reactions: true,
        closingChart: true,
        chartThreshold: 3,
        follow: false,
      },
    },
    {
      id: 'lab-follow',
      label: 'Lab + follow',
      config: {
        presence: true,
        reactions: true,
        closingChart: true,
        chartThreshold: 3,
        follow: true,
      },
    },
    {
      id: 'talk-only',
      label: 'Talk-only',
      config: {
        presence: false,
        reactions: false,
        closingChart: false,
        chartThreshold: 3,
        follow: false,
      },
    },
  ];
