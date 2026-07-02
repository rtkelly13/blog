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
import { DeckDriver, Follower } from './DeckLive';
import { DeckModeProvider } from './DeckModeContext';
import { AttendeeSidebar, ConsoleSidebar } from './DeckSidebars';
import SlideBody from './SlideBody';
import { brutalistTheme } from './theme';

export interface DeckSlide {
  code: string;
  notes: string | null;
  notesCode: string | null;
}

interface SpectacleDeckProps {
  slides: DeckSlide[];
  slug: string;
  /** Target length (frontmatter durationMins) — drives the console pacing timer. */
  durationMins?: number;
}

type Mode = 'attendee' | 'presenter' | 'console';

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
      {slide.notesCode ? (
        <Notes>
          <SlideBody code={slide.notesCode} />
        </Notes>
      ) : null}
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

function resolveMode(raw: unknown): Mode {
  if (raw === 'presenter' || raw === 'console' || raw === 'attendee') {
    return raw;
  }
  return 'attendee';
}

/**
 * Deck with the follow-the-presenter live layer, driven by ?mode=:
 *
 * - `presenter` (admin) → BROADCAST: this deck drives the room (identity-gated
 *   setSlide) and heartbeats a presenter session so clashes are detectable.
 *   Full-screen, clean (projector view).
 * - `attendee` (default) → WATCH ALONG: follows the presenter's slide and shows
 *   a reactions sidebar (react + everyone's synced reactions).
 * - `console` (admin) → follows + a presenter console sidebar (connection status,
 *   presence, reactions, live numbers, End talk) — the presenter's second screen.
 */
function LiveDeck({ slides, slug, durationMins }: SpectacleDeckProps) {
  const router = useRouter();
  const current = useQuery(api.talks.current);
  const setSlide = useMutation(api.talks.setSlide);
  const presenterPing = useMutation(api.talks.presenterPing);
  const { isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(api.talks.isAdmin) === true;

  const sessionIdRef = useRef('');
  if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID();

  // The console's Prev/Next drive the embedded deck (which then broadcasts),
  // and the deck reports its slide index up for the console's notes/preview.
  const navRef = useRef<{ next: () => void; prev: () => void } | null>(null);
  const [deckIndex, setDeckIndex] = useState(0);

  const [pubSlide, setPubSlide] = useState<number | null>(null);
  const [pubError, setPubError] = useState<string | null>(null);
  const onPublished = useCallback((index: number) => {
    setPubSlide(index);
    setPubError(null);
  }, []);
  const onError = useCallback((message: string) => setPubError(message), []);

  const mode = resolveMode(router.query.mode);

  // Live state for THIS deck's talk.
  const liveHere = current?.slug === slug;
  const followOn = liveHere && current?.config.follow === true;
  const reactionsOn = liveHere && current?.config.reactions === true;
  const room = current?.room;

  // Both presenter and console DRIVE the deck (their navigation broadcasts);
  // attendees follow. Same admin identity, so both heartbeat a presenter session
  // and two connected at once surfaces a clash.
  const broadcasting =
    (mode === 'presenter' || mode === 'console') && followOn && isAdmin;
  const followEnabled = followOn && !broadcasting;

  const showAttendeeSidebar = mode === 'attendee' && Boolean(reactionsOn);
  const showConsoleSidebar = mode === 'console' && isAdmin && Boolean(liveHere);
  const showPresenterHud = mode === 'presenter' && isAuthenticated && isAdmin;

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

  // Deck-native reveal: while driving the deck with an open activity whose answer
  // is still hidden, the next "advance" press reveals the canonical answer to the
  // room instead of changing slide (a Spectacle-stepper-style beat). A second
  // press then advances normally. Only the broadcasting deck arms this.
  const openActivity = useQuery(
    api.activities.active,
    broadcasting && room ? { room } : 'skip',
  );
  const revealNow = useMutation(api.activities.revealNow);
  const pendingReveal =
    broadcasting && openActivity && !openActivity.revealed
      ? openActivity._id
      : null;

  useEffect(() => {
    if (!pendingReveal) return;
    const ADVANCE = new Set([' ', 'Spacebar', 'ArrowRight', 'PageDown']);
    const onKey = (e: KeyboardEvent) => {
      if (!ADVANCE.has(e.key)) return;
      // Beat Spectacle's own handler and consume this press.
      e.preventDefault();
      e.stopImmediatePropagation();
      revealNow({ id: pendingReveal }).catch(() => {});
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [pendingReveal, revealNow]);

  const template = ({
    slideNumber,
    numberOfSlides,
  }: {
    slideNumber: number;
    numberOfSlides: number;
  }) => (
    <>
      <Chrome slideNumber={slideNumber} numberOfSlides={numberOfSlides} />
      {broadcasting ? (
        <DeckDriver
          room={room}
          initialSlide={current?.currentSlide ?? 0}
          setSlide={setSlide}
          onIndex={setDeckIndex}
          navRef={navRef}
          onPublished={onPublished}
          onError={onError}
        />
      ) : (
        <Follower
          enabled={followEnabled}
          currentSlide={current?.currentSlide}
        />
      )}
    </>
  );

  const deckEl = (
    <DeckModeProvider value={mode}>
      <Deck theme={brutalistTheme} template={template}>
        {renderSlides(slides)}
      </Deck>
    </DeckModeProvider>
  );

  const sidebar =
    showAttendeeSidebar && room ? (
      <AttendeeSidebar room={room} />
    ) : showConsoleSidebar && room ? (
      <ConsoleSidebar
        room={room}
        slides={slides}
        currentSlide={deckIndex}
        onPrev={() => navRef.current?.prev()}
        onNext={() => navRef.current?.next()}
        startedAt={current?.startedAt}
        durationMins={durationMins}
      />
    ) : null;
  // The console is a working cockpit (controls + notes + preview), so give it
  // more room than the slim attendee reactions rail.
  const sidebarWidth = showConsoleSidebar ? '34vw' : '20vw';

  // With a sidebar, the deck occupies the left ~4/5 (Spectacle scales into its
  // container) and the sidebar fills the right 1/5. Use dvh (dynamic viewport)
  // + overflow-hidden so the layout fits the *visible* height — otherwise
  // browser UI that shrinks the viewport (mobile chrome bars, or Chrome's
  // "controlled by automated test software" infobar) pushes content off-screen.
  if (sidebar) {
    return (
      <div
        style={{
          display: 'flex',
          width: '100vw',
          height: '100dvh',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '100dvh',
            flex: '1 1 0%',
            minWidth: 0,
          }}
        >
          {deckEl}
        </div>
        <div
          style={{
            height: '100dvh',
            flex: `0 0 ${sidebarWidth}`,
            width: sidebarWidth,
          }}
        >
          {sidebar}
        </div>
      </div>
    );
  }

  return (
    <>
      {deckEl}
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
            {!followOn
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
          {pendingReveal && (
            <span
              style={{
                border: '2px solid #facc15',
                background: '#facc15',
                color: '#000',
                padding: '0.3rem 0.6rem',
              }}
            >
              ▶ next reveals the answer
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
 * gains the ?mode= live layer; otherwise it's the plain deck.
 */
export default function SpectacleDeck({
  slides,
  slug,
  durationMins,
}: SpectacleDeckProps) {
  if (!isConvexConfigured) return <BaseDeck slides={slides} />;
  return <LiveDeck slides={slides} slug={slug} durationMins={durationMins} />;
}
