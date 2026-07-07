import { useMemo } from 'react';
import { renderGraphic } from './registry';
import type { GraphicParams } from './types';

interface GeneratedBackgroundProps extends Partial<GraphicParams> {
  /** Generator id from the registry (e.g. `node-network`). */
  generator: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a graphic generator inline as a full-bleed SVG layer. Decorative, so
 * it's marked aria-hidden. For CSS/Spectacle backgrounds prefer `graphicDataUri`
 * (registry) — this component is for the gallery and in-flow decoration.
 */
export default function GeneratedBackground({
  generator,
  className,
  style,
  seed,
  accent,
  background,
  density,
  opacity,
  strokeWidth,
  width,
  height,
}: GeneratedBackgroundProps) {
  // Memoise on the individual primitive params (not the rest object, which is a
  // fresh reference each render) so the SVG is only rebuilt when a value changes.
  const svg = useMemo(
    () =>
      renderGraphic(generator, {
        seed,
        accent,
        background,
        density,
        opacity,
        strokeWidth,
        width,
        height,
      }),
    [
      generator,
      seed,
      accent,
      background,
      density,
      opacity,
      strokeWidth,
      width,
      height,
    ],
  );

  if (!svg) return null;

  return (
    <div
      aria-hidden
      className={className}
      style={{ lineHeight: 0, ...style }}
      // SVG is generated from a fixed template + numeric params — no user input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
