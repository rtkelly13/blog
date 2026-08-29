/**
 * Which slide-embedded components belong to a live room, and how to take them
 * out of a render.
 *
 * A deck slide can embed audience machinery — a poll, a question queue, a break
 * timer. Every one of them is realtime: it subscribes to Convex, shows state
 * that only exists while a room is open, and is meaningless in a recording. A
 * video of a talk that renders an empty poll is worse than one that renders no
 * poll, because the empty poll looks like a bug.
 *
 * They also cannot simply be left to fail. Outside a Convex provider their
 * hooks have nothing to read, so what a render would capture is whatever each
 * component happens to do with `undefined` — a loading state, a zero count, or
 * a thrown error. That is three different wrong answers rather than one right
 * one.
 *
 * So the boundary blanks them by name. This is a whitelist at the single place
 * a slide's components are resolved, rather than a flag threaded through seven
 * components, and `tests/talk-video.test.ts` asserts the list still covers
 * every realtime component the module exports — so adding an eighth and
 * forgetting this file fails the suite instead of shipping a dead widget into a
 * video.
 */

import type { ComponentType } from 'react';

/**
 * Components that only mean something in a live room.
 *
 * Kept as names rather than references so this module stays free of the
 * imports — it is consulted by a render boundary that should not pull Convex
 * into its bundle just to decide what to leave out.
 */
export const LIVE_COMPONENT_NAMES = [
  'BreakTimer',
  'EmojiTop5',
  'LivePoll',
  'OrderedActions',
  'QuestionQueue',
  'RateLimitNotice',
  'TalkTimer',
] as const;

export type LiveComponentName = (typeof LIVE_COMPONENT_NAMES)[number];

/** Renders nothing, and is named so it is obvious in a React tree. */
const Blank: ComponentType = function OmittedFromRender() {
  return null;
};

/**
 * A component map with every live component replaced by one that renders
 * nothing.
 *
 * Returns a new object; the input map is the site's shared `MDXComponents` and
 * is used by every other surface.
 */
export function withoutLiveComponents<T extends Record<string, unknown>>(
  components: T,
): T {
  const out = { ...components } as Record<string, unknown>;
  for (const name of LIVE_COMPONENT_NAMES) {
    if (name in out) out[name] = Blank;
  }
  return out as T;
}
