import { createContext, useContext } from 'react';

/**
 * Which surface an embedded audience component is rendering on:
 * - `attendee` — /live or a watch-along deck: reveal-gated + interactive form.
 * - `presenter` — the projected deck the room sees: reveal-gated, display-only.
 * - `console` — the presenter's 2nd screen: ALWAYS shows details + moderation
 *   output, regardless of the shared reveal flag.
 *
 * Defaults to `attendee` so components used outside a deck (e.g. on /live, or
 * without Convex) behave as the audience-facing, reveal-gated version.
 */
export type DeckMode = 'attendee' | 'presenter' | 'console';

const DeckModeContext = createContext<DeckMode>('attendee');

export const DeckModeProvider = DeckModeContext.Provider;

export function useDeckMode(): DeckMode {
  return useContext(DeckModeContext);
}
