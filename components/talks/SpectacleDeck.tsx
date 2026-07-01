import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useRouter } from 'next/router';
import { useState } from 'react';
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
 * Deck with the follow-the-presenter live layer. Anyone viewing the live,
 * follow-enabled talk's deck follows along by default (soft-follow). Only a
 * signed-in admin sees the Broadcast control; flipping it makes their navigation
 * drive the room via the identity-gated setSlide mutation (no key). The
 * broadcaster and follower live inside the deck template so they can read/drive
 * Spectacle's navigation via DeckContext.
 */
function LiveDeck({ slides, slug }: SpectacleDeckProps) {
  const router = useRouter();
  const current = useQuery(api.talks.current);
  const setSlide = useMutation(api.talks.setSlide);
  const { isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(api.talks.isAdmin) === true;

  const [broadcastOn, setBroadcastOn] = useState(false);

  // Follow engages by default whenever the live, follow-enabled talk is this
  // deck — no query param needed, so simply opening the deck follows along.
  // Broadcasting is the admin opt-in; while broadcasting, this tab stops
  // following so the admin's own navigation drives the room. ?follow=live is
  // just a clean audience view that hides the Broadcast control.
  const isAudienceMode = router.query.follow === 'live';
  const matches = current?.slug === slug && current?.config.follow === true;
  const broadcasting = matches && broadcastOn && isAdmin;
  const followEnabled = matches && !broadcasting;
  // The Broadcast control is only offered to a signed-in admin, and never in the
  // clean audience view.
  const showBroadcastControl = !isAudienceMode && isAuthenticated && isAdmin;

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
        room={current?.room}
        setSlide={setSlide}
      />
      <Follower enabled={followEnabled} currentSlide={current?.currentSlide} />
    </>
  );

  return (
    <>
      <Deck theme={brutalistTheme} template={template}>
        {renderSlides(slides)}
      </Deck>

      {showBroadcastControl && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontFamily: MONO,
            fontSize: '0.75rem',
          }}
        >
          {broadcastOn && (
            <span
              style={{
                color: broadcasting ? '#22d3ee' : '#facc15',
                textTransform: 'uppercase',
              }}
            >
              {broadcasting ? '● broadcasting' : 'start a follow talk'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setBroadcastOn((v) => !v)}
            style={{
              border: '2px solid #fff',
              background: broadcastOn ? '#22d3ee' : '#000',
              color: broadcastOn ? '#000' : '#fff',
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '0.3rem 0.7rem',
              cursor: 'pointer',
            }}
          >
            Broadcast {broadcastOn ? '●' : '○'}
          </button>
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
