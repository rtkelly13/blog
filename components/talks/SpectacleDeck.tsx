import {
  Box,
  Deck,
  FlexBox,
  FullScreen,
  Notes,
  Progress,
  Slide,
} from 'spectacle';
import SlideBody from './SlideBody';
import { brutalistTheme } from './theme';

export interface DeckSlide {
  code: string;
  notes: string | null;
}

interface SpectacleDeckProps {
  slides: DeckSlide[];
}

const MONO = '"Courier New", Courier, monospace';

// Brutalist deck chrome: fullscreen toggle, progress dots, slide counter.
const template = ({
  slideNumber,
  numberOfSlides,
}: {
  slideNumber: number;
  numberOfSlides: number;
}) => (
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

/**
 * Spectacle owns the deck shell — keyboard navigation, transitions, overview
 * (mod+shift+o), presenter mode + speaker notes (mod+shift+p), and print /
 * export modes (mod+shift+r / mod+shift+e, or ?printMode=true / ?exportMode=true).
 * Each slide's body is our MDX content, so markdown authoring + <Diagram> /
 * mermaid / brutalist theme are preserved.
 */
export default function SpectacleDeck({ slides }: SpectacleDeckProps) {
  return (
    <Deck theme={brutalistTheme} template={template}>
      {slides.map((slide, i) => (
        <Slide
          // biome-ignore lint/suspicious/noArrayIndexKey: slides are a stable ordered list
          key={i}
          backgroundColor="#000000"
        >
          <SlideBody code={slide.code} />
          {slide.notes ? <Notes>{slide.notes}</Notes> : null}
        </Slide>
      ))}
    </Deck>
  );
}
