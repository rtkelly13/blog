import { createContext, useContext } from 'react';

/**
 * Index of the deck slide this component is embedded in. Spectacle keeps every
 * slide mounted, so a slide-embedded widget can use this to say "I live on
 * slide N" regardless of which slide is showing. Null outside a deck (e.g. on
 * /live).
 */
const SlideIndexContext = createContext<number | null>(null);

export const SlideIndexProvider = SlideIndexContext.Provider;

export function useSlideIndex(): number | null {
  return useContext(SlideIndexContext);
}

/**
 * Registry a *driving* deck (presenter/console, admin, live-here) provides so
 * slide-embedded activity widgets can report which slide declares the
 * currently-open activity. The reveal beat then arms on that slide — not on
 * whichever slide the presenter happened to be on when the activity opened
 * (e.g. opened from /admin while off the activity slide). Null on every
 * non-driving surface, so widgets can skip reporting entirely.
 */
export type ActivitySlideRegistry = {
  report: (activityId: string, slideIndex: number) => void;
};

const ActivitySlideRegistryContext =
  createContext<ActivitySlideRegistry | null>(null);

export const ActivitySlideRegistryProvider =
  ActivitySlideRegistryContext.Provider;

export function useActivitySlideRegistry(): ActivitySlideRegistry | null {
  return useContext(ActivitySlideRegistryContext);
}
