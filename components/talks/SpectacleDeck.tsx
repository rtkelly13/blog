import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Deck,
  FlexBox,
  FullScreen,
  fadeTransition,
  Notes,
  Progress,
  Slide,
} from 'spectacle';
import type { TalkBackground } from 'types/TalkFrontMatter';
import { useRunAction } from '@/components/admin/useRunAction';
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
import {
  ActivitySlideRegistryProvider,
  SlideIndexProvider,
} from './RevealBeatContext';
import SlideBody from './SlideBody';
import { brutalistTheme } from './theme';

export interface DeckSlide {
  code: string;
  notes: string | null;
  notesCode: string | null;
  /** Per-slide `[⏱ a–b …]` timing window (minutes from talk start), if any. */
  window?: SlideWindow | null;
  /** Name of the background this slide selects (frontmatter `backgrounds`). */
  background?: string | null;
}

interface SpectacleDeckProps {
  slides: DeckSlide[];
  slug: string;
  /** Target length (frontmatter durationMins) — drives the console pacing timer. */
  durationMins?: number;
  /** Named background definitions (frontmatter `backgrounds`). */
  backgrounds?: Record<string, TalkBackground>;
  /** Deck-wide default background name (frontmatter `background`). */
  defaultBackground?: string;
}

type Mode = 'attendee' | 'presenter' | 'console';

const MONO =
  'var(--font-ibm-plex-mono, "IBM Plex Mono"), "Courier New", Courier, monospace';

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

// A generated background is baked into a single data-URI SVG (opacity folded in).
function backgroundUri(bg?: TalkBackground): string | undefined {
  if (!bg?.generator) return undefined;
  const uri = graphicDataUri(bg.generator, {
    seed: bg.seed,
    accent: bg.accent,
    density: bg.density,
    opacity: bg.opacity ?? 0.18,
  });
  return uri ? `url("${uri}")` : undefined;
}

/** Resolve each named background to a CSS `url(...)` once. */
function buildBackgroundUris(
  backgrounds?: Record<string, TalkBackground>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, bg] of Object.entries(backgrounds ?? {})) {
    const uri = backgroundUri(bg);
    if (uri) out[name] = uri;
  }
  return out;
}

/**
 * Fixed backdrop behind the whole deck: one layer per named background, shown
 * via opacity. Only the active slide's background is opaque, so the backdrop
 * stays put between slides that share a name and cross-fades only when the name
 * actually changes — the content transitions, the backdrop mostly doesn't.
 */
function DeckBackground({
  uris,
  activeName,
}: {
  uris: Record<string, string>;
  activeName: string | null;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        backgroundColor: '#000000',
      }}
    >
      {Object.entries(uris).map(([name, uri]) => (
        <div
          key={name}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: uri,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: name === activeName ? 1 : 0,
            transition: 'opacity 500ms ease',
          }}
        />
      ))}
    </div>
  );
}

/** Reports the active slide index up from inside the persistent template. */
function ActiveSlideReporter({
  index,
  onChange,
}: {
  index: number;
  onChange: (i: number) => void;
}) {
  useEffect(() => {
    onChange(index);
  }, [index, onChange]);
  return null;
}

// With backgrounds present the slides + deck backdrop go transparent so the
// fixed DeckBackground shows through and stays put across transitions.
function deckTheme(hasBackground: boolean): typeof brutalistTheme {
  if (!hasBackground) return brutalistTheme;
  return {
    ...brutalistTheme,
    backdropStyle: { backgroundColor: 'transparent' },
  };
}

function renderSlides(slides: DeckSlide[], hasBackground: boolean) {
  return slides.map((slide, i) => (
    <Slide key={i} backgroundColor={hasBackground ? 'transparent' : '#000000'}>
      <SlideIndexProvider value={i}>
        <SlideBody code={slide.code} />
      </SlideIndexProvider>
      {slide.notesCode ? (
        <Notes>
          <SlideBody code={slide.notesCode} />
        </Notes>
      ) : null}
    </Slide>
  ));
}

/** The active slide's background name, or the deck default, or null. */
function activeBackgroundName(
  slides: DeckSlide[],
  active: number,
  defaultBackground?: string,
): string | null {
  return slides[active]?.background ?? defaultBackground ?? null;
}

/** Deck with no live layer — used when Convex isn't configured. */
function BaseDeck({
  slides,
  backgrounds,
  defaultBackground,
}: {
  slides: DeckSlide[];
  backgrounds?: Record<string, TalkBackground>;
  defaultBackground?: string;
}) {
  const uris = useMemo(() => buildBackgroundUris(backgrounds), [backgrounds]);
  const hasBg = Object.keys(uris).length > 0;
  const [active, setActive] = useState(0);
  const activeName = activeBackgroundName(slides, active, defaultBackground);

  const template = ({
    slideNumber,
    numberOfSlides,
  }: {
    slideNumber: number;
    numberOfSlides: number;
  }) => (
    <>
      <Chrome slideNumber={slideNumber} numberOfSlides={numberOfSlides} />
      <ActiveSlideReporter index={slideNumber - 1} onChange={setActive} />
    </>
  );

  return (
    <>
      {hasBg && <DeckBackground uris={uris} activeName={activeName} />}
      <Deck
        theme={deckTheme(hasBg)}
        template={template}
        transition={hasBg ? fadeTransition : undefined}
      >
        {renderSlides(slides, hasBg)}
      </Deck>
    </>
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
  backgrounds,
  defaultBackground,
}: SpectacleDeckProps) {
  const router = useRouter();
  const current = useQuery(api.talks.current);
  const setSlide = useMutation(api.talks.setSlide);
  const presenterPing = useMutation(api.talks.presenterPing);
  const { isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(api.talks.isAdmin) === true;

  const sessionIdRef = useRef('');
  if (!sessionIdRef.current) sessionIdRef.current = crypto.randomUUID();

  // Named-background backdrop state (see BaseDeck for the model). `bgActive` is
  // the visible slide reported by the template, independent of the live/console
  // driving index so the backdrop tracks correctly in every mode.
  const bgUris = useMemo(() => buildBackgroundUris(backgrounds), [backgrounds]);
  const hasBg = Object.keys(bgUris).length > 0;
  const [bgActive, setBgActive] = useState(0);
  const bgName = activeBackgroundName(slides, bgActive, defaultBackground);

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

  // Slide-embedded activity widgets report which slide *declares* the open
  // activity (matched by prompt — Spectacle keeps every slide mounted, so the
  // declaring slide's widget is live even while the presenter is elsewhere).
  // Keyed by activity id; an activity launched from /admin with a prompt no
  // slide declares simply never registers.
  const [declaredSlides, setDeclaredSlides] = useState<Record<string, number>>(
    {},
  );
  const slideRegistry = useMemo(
    () => ({
      report: (activityId: string, slideIndex: number) =>
        setDeclaredSlides((m) =>
          m[activityId] === slideIndex ? m : { ...m, [activityId]: slideIndex },
        ),
    }),
    [],
  );

  // Record the slide the presenter is on the moment a reveal arms (derived
  // during render so it captures the arm-time slide, not later navigation).
  // Only the fallback for activities no slide declares — the declaring slide,
  // when known, always wins (fixes arming the wrong slide when the activity is
  // opened from /admin while the presenter is elsewhere in the deck).
  const prevPendingRef = useRef<string | null>(null);
  const armedSlideRef = useRef<number | null>(null);
  if (pendingReveal !== prevPendingRef.current) {
    prevPendingRef.current = pendingReveal;
    armedSlideRef.current = pendingReveal ? deckIndex : null;
  }
  const armedSlide =
    (pendingReveal != null ? declaredSlides[pendingReveal] : undefined) ??
    armedSlideRef.current;
  // Arm the next-key reveal only while the presenter is on the activity's own
  // slide — advancing on any other slide navigates normally instead of
  // prematurely broadcasting the answer.
  const revealArmed =
    pendingReveal != null && deckIndex === armedSlide ? pendingReveal : null;

  // Surface reveal failures (e.g. a lapsed admin session) instead of a silent
  // no-op — the beat consumes the keypress, so a swallowed error looks like a
  // dead deck.
  const { run: runReveal, error: revealError } = useRunAction();
  useEffect(() => {
    if (!revealArmed) return;
    const ADVANCE = new Set([' ', 'Spacebar', 'ArrowRight', 'PageDown']);
    const onKey = (e: KeyboardEvent) => {
      if (!ADVANCE.has(e.key)) return;
      // Never steal keys from form fields (console break-minutes input etc.) —
      // same guard as the "Q" toggle above.
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable)
      ) {
        return;
      }
      // Beat Spectacle's own handler and consume this press.
      e.preventDefault();
      e.stopImmediatePropagation();
      void runReveal(() => revealNow({ id: revealArmed }));
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [revealArmed, revealNow, runReveal]);

  const template = ({
    slideNumber,
    numberOfSlides,
  }: {
    slideNumber: number;
    numberOfSlides: number;
  }) => (
    <>
      <Chrome slideNumber={slideNumber} numberOfSlides={numberOfSlides} />
      <ActiveSlideReporter index={slideNumber - 1} onChange={setBgActive} />
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
      <ActivitySlideRegistryProvider value={drivingDeck ? slideRegistry : null}>
        <Deck
          theme={deckTheme(hasBg)}
          template={template}
          transition={hasBg ? fadeTransition : undefined}
        >
          {renderSlides(slides, hasBg)}
        </Deck>
      </ActivitySlideRegistryProvider>
    </DeckModeProvider>
  );

  // Reveal-beat failure chip — shown on any driving deck (the presenter HUD is
  // presenter-mode-only, and the console needs the feedback too).
  const revealErrorChip = drivingDeck && revealError && (
    <div
      style={{
        position: 'fixed',
        bottom: '3.5rem',
        right: '1rem',
        zIndex: 40,
        border: '2px solid #f472b6',
        background: '#000',
        color: '#f472b6',
        padding: '0.3rem 0.6rem',
        fontFamily: MONO,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        fontWeight: 700,
      }}
    >
      reveal failed: {revealError}
    </div>
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
      <>
        {hasBg && <DeckBackground uris={bgUris} activeName={bgName} />}
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
            {revealErrorChip}
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
      </>
    );
  }

  return (
    <>
      {hasBg && <DeckBackground uris={bgUris} activeName={bgName} />}
      {deckEl}
      {hud}
      {revealErrorChip}
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
  backgrounds,
  defaultBackground,
}: SpectacleDeckProps) {
  if (!isConvexConfigured)
    return (
      <BaseDeck
        slides={slides}
        backgrounds={backgrounds}
        defaultBackground={defaultBackground}
      />
    );
  return (
    <LiveDeck
      slides={slides}
      slug={slug}
      durationMins={durationMins}
      backgrounds={backgrounds}
      defaultBackground={defaultBackground}
    />
  );
}
