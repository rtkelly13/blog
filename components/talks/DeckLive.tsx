import type { useMutation } from 'convex/react';
import { useContext, useEffect, useRef, useState } from 'react';
import { DeckContext } from 'spectacle';

type SetSlide = ReturnType<typeof useMutation>;

type NavRef = { current: { next: () => void; prev: () => void } | null };

/**
 * Driving surface (presenter deck OR console). Rendered inside <Deck> so it can
 * read/drive Spectacle's navigation via DeckContext. Navigating the deck (arrows,
 * or the console's Prev/Next through `navRef`) publishes the active slide to the
 * room — the deck itself is the source of truth, so it never "detaches". On mount
 * it aligns to the room's current slide (so opening a driver mid-talk doesn't
 * reset everyone to the first slide), and only broadcasts once aligned.
 */
export function DeckDriver({
  room,
  initialSlide,
  setSlide,
  onIndex,
  navRef,
  onPublished,
  onError,
}: {
  room?: string;
  initialSlide: number;
  setSlide: SetSlide;
  onIndex?: (index: number) => void;
  navRef?: NavRef;
  onPublished?: (index: number) => void;
  onError?: (message: string) => void;
}) {
  const { activeView, skipTo, advanceSlide, regressSlide } =
    useContext(DeckContext);
  const index = activeView.slideIndex;
  // The room's slide at the moment this driver opened — captured once (this
  // component only mounts after the talk has loaded), then we align to it.
  const targetRef = useRef(initialSlide);
  const [aligned, setAligned] = useState(false);

  // Expose deck navigation to out-of-deck controls (the console Prev/Next).
  if (navRef) navRef.current = { next: advanceSlide, prev: regressSlide };

  // Align to the room's slide, retrying until it lands — Spectacle can drop an
  // early skipTo before its navigation is ready. Once aligned we start driving;
  // we never broadcast the pre-alignment position (which would reset the room).
  useEffect(() => {
    if (aligned) return;
    if (index === targetRef.current) {
      setAligned(true);
      return;
    }
    skipTo({ slideIndex: targetRef.current, stepIndex: 0 });
  }, [aligned, index, skipTo]);

  // Report position for the console's notes/preview (always).
  useEffect(() => {
    onIndex?.(index);
  }, [index, onIndex]);

  // Broadcast position to the room (only after alignment).
  useEffect(() => {
    if (!aligned || !room) return;
    setSlide({ room, index })
      .then(() => onPublished?.(index))
      .catch((e) =>
        onError?.(e instanceof Error ? e.message : 'broadcast failed'),
      );
  }, [aligned, index, room, setSlide, onPublished, onError]);

  return null;
}

/**
 * Audience side of follow-the-presenter. Rendered inside <Deck>, it mirrors the
 * presenter's slide via skipTo. Soft-follow: if the viewer navigates on their
 * own they detach to free-roam (a "resume" button re-attaches). We distinguish
 * a presenter move (currentSlide changed → follow it) from a manual move
 * (activeView changed on its own → detach) by tracking the previous values.
 * On join it aligns to the room's slide, retrying until it lands — the same
 * dropped-early-skipTo race DeckDriver works around; without the retry a
 * mid-talk joiner sits on slide 1 until the presenter next moves.
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
  const [aligned, setAligned] = useState(false);
  const prevCurrent = useRef(currentSlide);
  const prevActive = useRef(active);

  // Join alignment: drive to the room's slide until Spectacle actually lands
  // there (an early skipTo can be silently dropped before nav is ready).
  useEffect(() => {
    if (aligned || !enabled || currentSlide == null || detached) return;
    if (active === currentSlide) {
      setAligned(true);
      return;
    }
    skipTo({ slideIndex: currentSlide, stepIndex: 0 });
    const retry = setInterval(
      () => skipTo({ slideIndex: currentSlide, stepIndex: 0 }),
      250,
    );
    return () => clearInterval(retry);
  }, [aligned, enabled, currentSlide, active, detached, skipTo]);

  useEffect(() => {
    if (!enabled || currentSlide == null) {
      prevCurrent.current = currentSlide;
      prevActive.current = active;
      return;
    }
    if (!aligned) {
      // Pre-alignment navigation belongs to the join effect above — don't let
      // its skipTos read as manual moves and detach the viewer.
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
  }, [enabled, currentSlide, active, detached, aligned, skipTo]);

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
