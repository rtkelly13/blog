import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { graphicThemeDefaults } from './palette';
import { getGenerator, resolveParams } from './registry';
import type { GraphicParams } from './types';

interface AnimatedBackgroundProps extends Partial<GraphicParams> {
  /** Generator id from the registry (e.g. `interference`). */
  generator: string;
  /** Seconds for one full loop. `t` runs 0..1 across it and then repeats. */
  duration?: number;
  /** Drive the loop. When false the frame at `t` is held. */
  playing?: boolean;
  /** Explicit loop position, 0..1. Used when `playing` is false. */
  t?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The generator split, actually used.
 *
 * `GeneratedBackground` calls `renderGraphic`, which samples *and* projects on
 * every change — fine for a still, and the wasteful half at 60fps. Worse than
 * wasteful, in fact: re-sampling per frame is the exact failure the
 * sample/project boundary exists to prevent, because any param drift between
 * frames re-rolls the whole composition into confetti.
 *
 * So this holds the sampled structure across frames and calls `project` alone
 * inside the loop. That is the usage `getGenerator()` was added for, and until
 * now the only thing doing it was the test suite.
 *
 * Motion is decorative, so it honours `prefers-reduced-motion` by holding the
 * still frame — which costs nothing to implement, because `t = 0` *is* the
 * still frame by construction.
 */
export default function AnimatedBackground({
  generator,
  duration = 12,
  playing = true,
  t = 0,
  className,
  style,
  seed,
  accent,
  background,
  occlusion,
  density,
  opacity,
  strokeWidth,
  disorder,
  width,
  height,
}: AnimatedBackgroundProps) {
  const host = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const { resolvedTheme } = useTheme();
  const theme = graphicThemeDefaults(resolvedTheme);

  // Everything except `t`. Changing any of these re-samples, which is correct:
  // they are the params that define *what* is being drawn.
  const params = useMemo(
    () =>
      resolveParams(generator, {
        seed,
        accent: accent ?? theme.accent,
        background: background ?? theme.background,
        occlusion: occlusion ?? theme.occlusion,
        density,
        opacity,
        strokeWidth,
        disorder,
        width,
        height,
      }),
    [
      generator,
      seed,
      accent,
      background,
      occlusion,
      density,
      opacity,
      strokeWidth,
      disorder,
      width,
      height,
      theme.accent,
      theme.background,
      theme.occlusion,
    ],
  );

  const gen = getGenerator(generator);
  // Sampled once per param set and held across every frame of the loop.
  const structure = useMemo(
    () => (gen ? gen.sample(params) : null),
    [gen, params],
  );

  // Offscreen tiles do not animate.
  //
  // A gallery of these is a page of independent rAF loops, each re-serialising
  // a few thousand SVG elements every frame, and the browser has no idea they
  // are equivalent — so seventeen of them compete for one main thread whether
  // or not any are in view. Almost none usually are. Gating on intersection is
  // the difference between paying for what is visible and paying for the whole
  // page, and it costs one observer per tile.
  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      // A little margin, so a tile is already running by the time it is looked
      // at rather than visibly starting from its still frame.
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el || !gen || structure === null) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (!playing || reduced || !onScreen) {
      // Held frame. Scrolling away leaves whatever was last drawn rather than
      // snapping back to `t = 0`, so returning to a tile does not visibly reset
      // it — and a paused tile still honours the scrubber.
      if (!playing || reduced) {
        el.innerHTML = gen.project(structure, params, reduced ? 0 : t);
      }
      return;
    }

    let raf = 0;
    let start: number | null = null;
    const ms = Math.max(1, duration) * 1000;

    const tick = (now: number) => {
      if (start === null) start = now;
      // Modulo rather than a wrapping counter: `t` is normalised loop position,
      // and the generators guarantee `t = 1` renders as `t = 0`, so the seam is
      // already invisible and there is nothing to reset.
      el.innerHTML = gen.project(structure, params, ((now - start) % ms) / ms);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gen, structure, params, playing, t, duration, onScreen]);

  if (!gen) return null;

  // Decorative: the marks carry no information a reader needs.
  return (
    <div
      aria-hidden
      ref={host}
      className={className}
      style={{ lineHeight: 0, ...style }}
    />
  );
}
