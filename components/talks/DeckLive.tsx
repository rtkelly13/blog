import type { useMutation } from 'convex/react';
import { useContext, useEffect, useRef, useState } from 'react';
import { DeckContext } from 'spectacle';

type SetSlide = ReturnType<typeof useMutation>;

/**
 * Presenter side of follow-the-presenter. Rendered inside <Deck> (so it can read
 * the live navigation via DeckContext), it publishes the active slide index to
 * the talk whenever it changes. The mutation is identity-gated and server-guarded
 * to a live, follow-enabled talk, so a stray render simply no-ops.
 */
export function Broadcaster({
  enabled,
  room,
  slideIndex,
  setSlide,
  onPublished,
  onError,
}: {
  enabled: boolean;
  room?: string;
  /** Current slide index, driven by the deck template's slideNumber (reliable). */
  slideIndex: number;
  setSlide: SetSlide;
  onPublished?: (index: number) => void;
  onError?: (message: string) => void;
}) {
  useEffect(() => {
    if (!enabled || !room) return;
    setSlide({ room, index: slideIndex })
      .then(() => onPublished?.(slideIndex))
      .catch((e) =>
        onError?.(e instanceof Error ? e.message : 'broadcast failed'),
      );
  }, [enabled, room, slideIndex, setSlide, onPublished, onError]);

  return null;
}

/**
 * Audience side of follow-the-presenter. Rendered inside <Deck>, it mirrors the
 * presenter's slide via skipTo. Soft-follow: if the viewer navigates on their
 * own they detach to free-roam (a "resume" button re-attaches). We distinguish
 * a presenter move (currentSlide changed → follow it) from a manual move
 * (activeView changed on its own → detach) by tracking the previous values.
 */
export function Follower({
  enabled,
  currentSlide,
}: {
  enabled: boolean;
  currentSlide?: number;
}) {
  const { activeView, skipTo } = useContext(DeckContext);
  const active = activeView.slideIndex;
  const [detached, setDetached] = useState(false);
  const prevCurrent = useRef(currentSlide);
  const prevActive = useRef(active);

  useEffect(() => {
    if (!enabled || currentSlide == null) {
      prevCurrent.current = currentSlide;
      prevActive.current = active;
      return;
    }
    const presenterMoved = currentSlide !== prevCurrent.current;
    const userMoved = active !== prevActive.current;

    if (!detached) {
      if (presenterMoved) {
        // Presenter advanced — follow them.
        if (active !== currentSlide)
          skipTo({ slideIndex: currentSlide, stepIndex: 0 });
      } else if (userMoved) {
        // Viewer navigated on their own — let them roam.
        if (active !== currentSlide) setDetached(true);
      } else if (active !== currentSlide) {
        // Initial / reconcile: attached but out of sync.
        skipTo({ slideIndex: currentSlide, stepIndex: 0 });
      }
    }

    prevCurrent.current = currentSlide;
    prevActive.current = active;
  }, [enabled, currentSlide, active, detached, skipTo]);

  if (!enabled) return null;

  const behind = currentSlide != null && active !== currentSlide;

  return (
    <button
      type="button"
      onClick={() => {
        setDetached(false);
        if (currentSlide != null)
          skipTo({ slideIndex: currentSlide, stepIndex: 0 });
      }}
      style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        fontFamily: '"IBM Plex Mono", monospace',
        fontWeight: 700,
        textTransform: 'uppercase',
        fontSize: '0.8rem',
        padding: '0.4rem 0.9rem',
        border: '2px solid #fff',
        cursor: 'pointer',
        background: detached ? '#f472b6' : '#22d3ee',
        color: '#000',
        // Only call attention to it while the viewer is off the presenter's slide.
        opacity: detached && behind ? 1 : 0,
        pointerEvents: detached && behind ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }}
    >
      ● Live — resume
    </button>
  );
}
