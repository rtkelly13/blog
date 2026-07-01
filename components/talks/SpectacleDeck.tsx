import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Deck,
  FlexBox,
  FullScreen,
  Notes,
  Progress,
  Slide,
} from 'spectacle';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';
import { Broadcaster, Follower } from './DeckLive';
import SlideBody from './SlideBody';
import { brutalistTheme } from './theme';

export interface DeckSlide {
  code: string;
  notes: string | null;
}

interface SpectacleDeckProps {
  slides: DeckSlide[];
  slug: string;
}

const MONO = '"IBM Plex Mono", "Courier New", Courier, monospace';

// Brutalist deck chrome: fullscreen toggle, progress dots, slide counter.
function Chrome({
  slideNumber,
  numberOfSlides,
}: {
  slideNumber: number;
  numberOfSlides: number;
}) {
  return (
    <FlexBox
      justifyContent="space-between"
      alignItems="center"
      position="absolute"
      bottom={0}
      left={0}
      width="100%"
      padding="0.5em 1.5em"
    >
      <FullScreen color="#22d3ee" />
      <Progress color="#22d3ee" />
      <Box
        style={{
          fontFamily: MONO,
          fontWeight: 'bold',
          fontSize: '1.5rem',
          color: '#facc15',
        }}
      >
        {slideNumber} / {numberOfSlides}
      </Box>
    </FlexBox>
  );
}

function renderSlides(slides: DeckSlide[]) {
  return slides.map((slide, i) => (
    <Slide key={i} backgroundColor="#000000">
      <SlideBody code={slide.code} />
      {slide.notes ? <Notes>{slide.notes}</Notes> : null}
    </Slide>
  ));
}

/** Deck with no live layer — used when Convex isn't configured. */
function BaseDeck({ slides }: { slides: DeckSlide[] }) {
  return (
    <Deck theme={brutalistTheme} template={Chrome}>
      {renderSlides(slides)}
    </Deck>
  );
}

/**
 * Deck with the follow-the-presenter live layer.
 *
 * - `?presenter=true` + signed-in admin → BROADCAST: this deck's navigation
 *   drives the room (via the identity-gated setSlide), and it heartbeats a
 *   presenter session so we can warn if a second presenter is connected.
 * - otherwise → FOLLOW: mirror the presenter's slide (soft-follow). `?follow=live`
 *   is the clean audience view.
 *
 * Broadcaster/Follower live inside the deck template so they can read/drive
 * Spectacle's navigation.
 */
function LiveDeck({ slides, slug }: SpectacleDeckProps) {
  const router = useRouter();
  const current = useQuery(api.talks.current);
  const setSlide = useMutation(api.talks.setSlide);
  const presenterPing = useMutation(api.talks.presenterPing);
  const { isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(api.talks.isAdmin) === true;

  // Stable per-tab presenter session id (deck is client-only).
  const sessionIdRef = useRef('');
  if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID();

  const [pubSlide, setPubSlide] = useState<number | null>(null);
  const [pubError, setPubError] = useState<string | null>(null);
  const onPublished = useCallback((index: number) => {
    setPubSlide(index);
    setPubError(null);
  }, []);
  const onError = useCallback((message: string) => setPubError(message), []);

  const isPresenterMode = router.query.presenter === 'true';
  const isAudienceMode = router.query.follow === 'live';
  const matches = current?.slug === slug && current?.config.follow === true;
  // Broadcast only in explicit presenter mode, as an allowlisted admin, for the
  // live follow-enabled talk. Everyone else follows.
  const broadcasting = isPresenterMode && matches && isAdmin;
  const followEnabled = matches && !broadcasting;

  const room = current?.room;

  // Heartbeat this presenter session while broadcasting, so concurrent presenters
  // are detectable.
  useEffect(() => {
    if (!broadcasting || !room) return;
    const sessionId = sessionIdRef.current;
    const ping = () => {
      presenterPing({ room, sessionId }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 5000);
    return () => clearInterval(id);
  }, [broadcasting, room, presenterPing]);

  const presenterCount = useQuery(
    api.talks.presenterCount,
    broadcasting && room ? { room } : 'skip',
  );
  const clash = typeof presenterCount === 'number' && presenterCount > 1;

  const template = ({
    slideNumber,
    numberOfSlides,
  }: {
    slideNumber: number;
    numberOfSlides: number;
  }) => (
    <>
      <Chrome slideNumber={slideNumber} numberOfSlides={numberOfSlides} />
      <Broadcaster
        enabled={broadcasting}
        room={room}
        slideIndex={slideNumber - 1}
        setSlide={setSlide}
        onPublished={onPublished}
        onError={onError}
      />
      <Follower enabled={followEnabled} currentSlide={current?.currentSlide} />
    </>
  );

  // Presenter status HUD — only for a signed-in admin who opened presenter mode.
  const showPresenterHud =
    isPresenterMode && isAuthenticated && isAdmin && !isAudienceMode;

  return (
    <>
      <Deck theme={brutalistTheme} template={template}>
        {renderSlides(slides)}
      </Deck>

      {showPresenterHud && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '0.4rem',
            fontFamily: MONO,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              border: '2px solid #fff',
              background: '#000',
              padding: '0.3rem 0.6rem',
              color: pubError
                ? '#f472b6'
                : broadcasting
                  ? '#22d3ee'
                  : '#facc15',
            }}
          >
            {!matches
              ? 'no live follow talk'
              : pubError
                ? `broadcast error: ${pubError}`
                : `● presenting${pubSlide != null ? ` · slide ${pubSlide + 1}` : ''}`}
          </span>
          {clash && (
            <span
              style={{
                border: '2px solid #f472b6',
                background: '#f472b6',
                color: '#000',
                padding: '0.3rem 0.6rem',
              }}
            >
              ⚠ {presenterCount} presenters connected — you may clash
            </span>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Spectacle owns the deck shell — keyboard navigation, transitions, overview
 * (mod+shift+o), presenter mode + speaker notes (mod+shift+p), and print /
 * export modes (mod+shift+r / mod+shift+e, or ?printMode=true / ?exportMode=true).
 * Each slide's body is our MDX content, so markdown authoring + <Diagram> /
 * mermaid / brutalist theme are preserved. When Convex is configured the deck
 * gains an opt-in follow-the-presenter layer; otherwise it's the plain deck.
 */
export default function SpectacleDeck({ slides, slug }: SpectacleDeckProps) {
  if (!isConvexConfigured) return <BaseDeck slides={slides} />;
  return <LiveDeck slides={slides} slug={slug} />;
}
