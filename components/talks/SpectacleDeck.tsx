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
import type { TalkBackground } from 'types/TalkFrontMatter';
import { graphicDataUri } from '@/components/graphics';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';
import type { SlideWindow } from '@/lib/slideTiming';
import { DeckDriver, Follower } from './DeckLive';
import { DeckModeProvider } from './DeckModeContext';
import {
  AttendeeSidebar,
  ConsoleSidebar,
  PresenterQuestionsSidebar,
} from './DeckSidebars';
import SlideBody from './SlideBody';
import { brutalistTheme } from './theme';

export interface DeckSlide {
  code: string;
  notes: string | null;
  notesCode: string | null;
  /** Per-slide `[⏱ a–b …]` timing window (minutes from talk start), if any. */
  window?: SlideWindow | null;
}

interface SpectacleDeckProps {
  slides: DeckSlide[];
  slug: string;
  /** Target length (frontmatter durationMins) — drives the console pacing timer. */
  durationMins?: number;
  /** Optional generated deck background (frontmatter `background`). */
  background?: TalkBackground;
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

// A generated background is baked into a single data-URI SVG (opacity folded in)
// and applied to every slide via Spectacle's native full-bleed backgroundImage.
function backgroundImage(background?: TalkBackground): string | undefined {
  if (!background?.generator) return undefined;
  const uri = graphicDataUri(background.generator, {
    seed: background.seed,
    accent: background.accent,
    density: background.density,
    opacity: background.opacity ?? 0.18,
  });
  return uri ? `url("${uri}")` : undefined;
}

function renderSlides(slides: DeckSlide[], background?: TalkBackground) {
  const bgImage = backgroundImage(background);
  return slides.map((slide, i) => (
    <Slide
      key={i}
      backgroundColor="#000000"
      backgroundImage={bgImage}
      backgroundSize="cover"
    >
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
function BaseDeck({
  slides,
  background,
}: {
  slides: DeckSlide[];
  background?: TalkBackground;
}) {
  return (
    <Deck theme={brutalistTheme} template={Chrome}>
      {renderSlides(slides, background)}
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
 *   Full-screen, clean (projector view), with a toggleable question sidebar
 *   ("Q" or the HUD button) to show the room the audience-visible queue.
 * - `attendee` (default) → WATCH ALONG: follows the presenter's slide and shows
 *   a reactions sidebar (react + everyone's synced reactions).
 * - `console` (admin) → follows + a presenter console sidebar (connection status,
 *   presence, reactions, live numbers, End talk) — the presenter's second screen.
 */
function LiveDeck({
  slides,
  slug,
  durationMins,
  background,
}: SpectacleDeckProps) {
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
  // and two connected at once surfaces a multi-presenter notice. Concurrent
  // drivers resolve last-write-wins on the room's single slide: each driver
  // follows the other's moves (see DeckDriver), so surfaces converge instead
  // of diverging and stale-writing over each other.
  const broadcasting =
    (mode === 'presenter' || mode === 'console') && followOn && isAdmin;
  const followEnabled = followOn && !broadcasting;

  // A deck the presenter is actively driving on THIS live talk (presenter screen
  // or console), regardless of follow. Slide-broadcast still only takes effect
  // when `follow` is on (setSlide is gated server-side), but this deck always
  // renders the driver so it reports its slide index and wires Prev/Next — which
  // the deck-native reveal beat below needs even in a non-follow session.
  const drivingDeck =
    (mode === 'presenter' || mode === 'console') &&
    isAdmin &&
    Boolean(liveHere);

  const showAttendeeSidebar = mode === 'attendee' && Boolean(reactionsOn);
  const showConsoleSidebar = mode === 'console' && isAdmin && Boolean(liveHere);
  const showPresenterHud = mode === 'presenter' && isAuthenticated && isAdmin;

  // Projected-deck question sidebar: presenter-toggled ("Q" or the HUD button)
  // so the room can be shown the audience-visible queue on demand.
  const [qaOpen, setQaOpen] = useState(false);
  const showPresenterQuestions =
    showPresenterHud && qaOpen && Boolean(liveHere);

  // "Q" is deliberately outside Spectacle's advance keys (space/arrows/PageDown)
  // and its mod+shift chords — plain bubble-phase listener, so it also can't
  // interfere with the capture-phase reveal interceptor below.
  useEffect(() => {
    if (!showPresenterHud) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'q' && e.key !== 'Q') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      setQaOpen((open) => !open);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPresenterHud]);

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
  // press then advances normally. Armed on any deck the presenter is driving —
  // independent of follow, so it works in a non-follow session too.
  const openActivity = useQuery(
    api.activities.active,
    drivingDeck && room ? { room } : 'skip',
  );
  const revealNow = useMutation(api.activities.revealNow);
  const pendingReveal =
    drivingDeck && openActivity && !openActivity.revealed
      ? openActivity._id
      : null;

  // Record the slide the presenter is on the moment a reveal arms (derived
  // during render so it captures the arm-time slide, not later navigation).
  const prevPendingRef = useRef<string | null>(null);
  const armedSlideRef = useRef<number | null>(null);
  if (pendingReveal !== prevPendingRef.current) {
    prevPendingRef.current = pendingReveal;
    armedSlideRef.current = pendingReveal ? deckIndex : null;
  }
  // Arm the next-key reveal only while the presenter is still on the activity's
  // own slide — advancing on any other slide navigates normally instead of
  // prematurely broadcasting the answer.
  const revealArmed =
    pendingReveal != null && deckIndex === armedSlideRef.current
      ? pendingReveal
      : null;

  useEffect(() => {
    if (!revealArmed) return;
    const ADVANCE = new Set([' ', 'Spacebar', 'ArrowRight', 'PageDown']);
    const onKey = (e: KeyboardEvent) => {
      if (!ADVANCE.has(e.key)) return;
      // Beat Spectacle's own handler and consume this press.
      e.preventDefault();
      e.stopImmediatePropagation();
      revealNow({ id: revealArmed }).catch(() => {});
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [revealArmed, revealNow]);

  const template = ({
    slideNumber,
    numberOfSlides,
  }: {
    slideNumber: number;
    numberOfSlides: number;
  }) => (
    <>
      <Chrome slideNumber={slideNumber} numberOfSlides={numberOfSlides} />
      {drivingDeck ? (
        <DeckDriver
          room={room}
          initialSlide={current?.currentSlide ?? 0}
          currentSlide={current?.currentSlide}
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
        {renderSlides(slides, background)}
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
    ) : showPresenterQuestions && room ? (
      <PresenterQuestionsSidebar room={room} />
    ) : null;
  // The console is a working cockpit (controls + notes + preview), so give it
  // more room than the slim attendee reactions rail; the projected question
  // queue sits in between (readable from the room without dwarfing the deck).
  const sidebarWidth = showConsoleSidebar
    ? '34vw'
    : showPresenterQuestions
      ? '26vw'
      : '20vw';

  // With a sidebar, the deck occupies the left ~4/5 (Spectacle scales into its
  // container) and the sidebar fills the right 1/5. Use dvh (dynamic viewport)
  // + overflow-hidden so the layout fits the *visible* height — otherwise
  // browser UI that shrinks the viewport (mobile chrome bars, or Chrome's
  // "controlled by automated test software" infobar) pushes content off-screen.
  // Presenter HUD — rendered fixed over the plain deck, or absolute inside the
  // deck pane when the question sidebar is open (so it doesn't cover the queue).
  const hud = showPresenterHud && (
    <div
      style={{
        position: sidebar ? 'absolute' : 'fixed',
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
          color: pubError ? '#f472b6' : broadcasting ? '#22d3ee' : '#facc15',
        }}
      >
        {!followOn
          ? 'no live follow talk'
          : pubError
            ? `broadcast error: ${pubError}`
            : `● presenting${pubSlide != null ? ` · slide ${pubSlide + 1}` : ''}`}
      </span>
      {liveHere && (
        <button
          type="button"
          onClick={() => setQaOpen((open) => !open)}
          style={{
            border: '2px solid #fff',
            background: qaOpen ? '#22d3ee' : '#000',
            color: qaOpen ? '#000' : '#fff',
            padding: '0.3rem 0.6rem',
            fontFamily: MONO,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {qaOpen ? 'hide questions · q' : 'show questions · q'}
        </button>
      )}
      {clash && (
        <span
          style={{
            border: '2px solid #f472b6',
            background: '#f472b6',
            color: '#000',
            padding: '0.3rem 0.6rem',
          }}
        >
          ⚠ {presenterCount} presenters connected — last change wins
        </span>
      )}
      {revealArmed && (
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
  );

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
          {hud}
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
      {hud}
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
  background,
}: SpectacleDeckProps) {
  if (!isConvexConfigured)
    return <BaseDeck slides={slides} background={background} />;
  return (
    <LiveDeck
      slides={slides}
      slug={slug}
      durationMins={durationMins}
      background={background}
    />
  );
}
