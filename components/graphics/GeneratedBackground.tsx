import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import { graphicThemeDefaults } from './palette';
import { getGenerator, renderGraphic } from './registry';
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
 *
 * `t` is accepted but this component does not animate it: each change re-samples
 * the generator, which is the wasteful half. Driving `t` per frame is a
 * renderer's job — hoist `sample` out of the loop via `getGenerator(name)` and
 * call `project` per frame instead.
 */
export default function GeneratedBackground({
  generator,
  className,
  style,
  seed,
  t,
  accent,
  background,
  density,
  opacity,
  strokeWidth,
  width,
  height,
}: GeneratedBackgroundProps) {
  // When the caller doesn't pin an accent, follow the site theme: ink-on-paper
  // under the light `sketch` theme, neon otherwise. An explicit `accent` (e.g.
  // a talk's signature colour, or the gallery picker) always wins.
  const { resolvedTheme } = useTheme();
  const theme = graphicThemeDefaults(resolvedTheme);
  const themedAccent = accent ?? theme.accent;
  // Only in the light theme, and only as much as the generator asks for — see
  // `GeneratorModule.sketchWeight`.
  const paperWeight =
    resolvedTheme === 'sketch'
      ? (getGenerator(generator)?.sketchWeight ?? 1)
      : 1;

  // Memoise on the individual primitive params (not the rest object, which is a
  // fresh reference each render) so the SVG is only rebuilt when a value changes.
  const svg = useMemo(
    () =>
      renderGraphic(generator, {
        seed,
        t,
        accent: themedAccent,
        background,
        density,
        opacity: (opacity ?? theme.opacity) * paperWeight,
        strokeWidth,
        width,
        height,
      }),
    [
      generator,
      seed,
      t,
      themedAccent,
      background,
      density,
      opacity,
      theme.opacity,
      paperWeight,
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
