/**
 * Composition registry for the spike.
 *
 * 1920x1080 is not a taste call: `BASE_PARAMS` is 1280x720, and 1280 x 1.5 =
 * 1920 exactly, so a 1080p composition is a pixel-aligned scale of the layout
 * the design system's visual baselines already lock. Nothing has to be retuned
 * to fit the frame.
 */
import { Composition } from 'remotion';
import { BackgroundLoop } from './BackgroundLoop';
import { TitleCard } from './TitleCard';
import './fonts.css';
import './transitions.css';

const FPS = 30;
const SECONDS = 10;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="ContourLoop"
      component={BackgroundLoop}
      durationInFrames={FPS * SECONDS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ generator: 'contour', ground: '#0a0a1a' }}
    />
    <Composition
      id="RidgelineLoop"
      component={BackgroundLoop}
      durationInFrames={FPS * SECONDS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ generator: 'ridgeline', ground: '#0a0a1a' }}
    />
    <Composition
      id="HexGridLoop"
      component={BackgroundLoop}
      durationInFrames={FPS * SECONDS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ generator: 'hex-grid', ground: '#0a0a1a' }}
    />
    <Composition
      id="TitleCard"
      component={TitleCard}
      durationInFrames={FPS * SECONDS}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{
        generator: 'contour',
        ground: '#0a0a1a',
        title: 'Context Driven\nDevelopment',
        subtitle: 'rendered from the code that draws the site',
      }}
    />
  </>
);
