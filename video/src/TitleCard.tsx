/**
 * The background with type over it — step 4 of the spike, and the step that
 * puts the font problem deliberately back in scope.
 *
 * `theme.css` resolves faces by *name* (`--ds-font-mono: var(--font-ibm-plex-mono),
 * "IBM Plex Mono", …`), and a name only resolves once the face is registered
 * with the document. Remotion seeks Chromium as fast as it can, so a frame
 * requested before `document.fonts` settles encodes in the fallback. On
 * monospace the advance width changes too, so it reads as the *layout* jumping
 * rather than as a font swap — and because it is a race it does not reproduce
 * identically between runs, which is the worst way for a bug to behave.
 *
 * `waitForFont` gates on that. Note honestly that the failure was **not**
 * reproduced here: rendering this card with the guard off differs from with it
 * on by 0.000% of pixels, because the face is bundled as a webpack asset rather
 * than fetched, so there is no round trip to lose a race against. See NOTES.md
 * §2. The guard stays because the cost is one effect and the failure mode is a
 * non-deterministic layout shift — not because it was observed doing work.
 */
import { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { BackgroundLoop, type BackgroundLoopProps } from './BackgroundLoop';

export interface TitleCardProps extends BackgroundLoopProps {
  title: string;
  subtitle?: string;
  /**
   * Gate rendering on `document.fonts.ready`. Default true, and there is no
   * good reason to pass false outside the measurement that justifies it.
   */
  waitForFont?: boolean;
}

export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  subtitle,
  waitForFont = true,
  ...background
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // `document.fonts.ready` covers every registered family at once, so this
  // cannot drift as faces are added — a per-family list would.
  const [handle] = useState(() => (waitForFont ? delayRender('fonts') : null));
  useEffect(() => {
    if (handle === null) return;
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);

  // Every visual change comes from the frame. A one-second fade, expressed as
  // arithmetic on `frame` rather than as a CSS transition — see transitions.css
  // for why the distinction is load-bearing.
  const fade = Math.min(1, frame / fps);
  // Held out of the last half-second so the loop point lands on a clean card.
  const out = Math.min(1, (durationInFrames - frame) / (fps * 0.5));

  return (
    <AbsoluteFill>
      <BackgroundLoop {...background} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '0 160px',
          opacity: Math.min(fade, out),
        }}
      >
        <div
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 500,
              fontSize: 34,
              marginTop: 28,
              letterSpacing: '0.08em',
              color: '#22d3ee',
              textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
