/**
 * A background generator, rendered as a seamless loop.
 *
 * The whole composition is four lines of real work, and that is the finding:
 * the generators were already frame-renderable. `sample()` consumes the rng
 * stream and depends on every param except `t`; `project()` is pure arithmetic
 * over that structure. So a frame renderer samples once and projects per frame,
 * which is exactly what `Generator`'s own doc comment tells it to do.
 *
 * The one rule this file enforces is the one Remotion cannot: **every visual
 * change comes from `useCurrentFrame()`**. See `transitions.css` for the other
 * half of it.
 */
import { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  getGenerator,
  resolveParams,
} from '../../components/graphics/registry';
import type { GraphicParams } from '../../components/graphics/types';

export interface BackgroundLoopProps {
  /** Generator id from the registry, e.g. `contour`, `ridgeline`, `hex-grid`. */
  generator: string;
  /** Overrides merged over the generator's own defaults. `t` is ignored. */
  params?: Partial<Omit<GraphicParams, 't'>>;
  /** Painted behind the graphic, which is normally transparent. */
  ground?: string;
}

export const BackgroundLoop: React.FC<BackgroundLoopProps> = ({
  generator,
  params,
  ground = '#0a0a1a',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const gen = getGenerator(generator);
  if (!gen) throw new Error(`Unknown generator: ${generator}`);

  // Resolved once. `resolveParams` merges over the generator's defaults, and
  // the viewBox stays at the generator's own aspect — the SVG scales to the
  // element, so asking for 1920x1080 here would change the composition rather
  // than its size. See `remotion.config` for why 1.5x is exact.
  const resolved = useMemo(
    () => resolveParams(gen, { ...params, t: 0 }),
    [gen, params],
  );

  // Sampled ONCE for the whole composition, not per frame. Re-sampling would
  // re-roll every rng draw on every frame — the failure the sample/project
  // split exists to prevent, and one that looks like violent flicker rather
  // than like a bug in a loop bound.
  const structure = useMemo(() => gen.sample(resolved), [gen, resolved]);

  // `frame / durationInFrames` never reaches 1, and that is what makes the loop
  // seamless: t=1 is defined to be the same image as t=0, so the frame after
  // the last one IS the first one. Using `durationInFrames - 1` would render
  // t=1 as a real frame and show frame 0 twice at the wrap.
  const t = frame / durationInFrames;
  const svg = gen.project(structure, resolved, t);

  return (
    <AbsoluteFill style={{ backgroundColor: ground }}>
      <AbsoluteFill
        style={{ width, height }}
        // The generator's contract is a complete SVG string. There is no user
        // input anywhere in this path — the markup is produced by our own pure
        // functions from numeric params.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </AbsoluteFill>
  );
};
