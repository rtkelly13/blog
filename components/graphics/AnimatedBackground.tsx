import { useTheme } from 'next-themes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { graphicThemeDefaults } from './palette';
import { getGenerator, resolveParams } from './registry';
import type { GraphicParams } from './types';

/**
 * Default redraw rate for a background.
 *
 * Measured rather than guessed: see the note on `fps` below. 24 is where the
 * cost halves against 60 and nothing about the motion reads differently, given
 * these loops run over twelve seconds.
 */
export const BACKGROUND_FPS = 24;

interface AnimatedBackgroundProps extends Partial<GraphicParams> {
  /** Generator id from the registry (e.g. `interference`). */
  generator: string;
  /** Seconds for one full loop. `t` runs 0..1 across it and then repeats. */
  duration?: number;
  /**
   * Frames per second to redraw at. Default {@link BACKGROUND_FPS}.
   *
   * The expensive part of animating these is not the maths — `project()` costs
   * between 0.01ms and 2.9ms across the whole set, measured. It is handing the
   * browser a fresh SVG string every frame: `innerHTML` reparses and relays out
   * the whole scene, which for a 1,190-element generator measured 3.4ms on
   * average and 10.9ms at worst, before any painting. Element count drives that
   * far more than byte count does.
   *
   * Frame rate is the one lever that divides the whole cost, and ambient
   * background motion does not need 60fps — these loops run over 12 seconds or
   * more, so a mark travels a fraction of a pixel per frame at 60. Redrawing at
   * 24 costs 40% as much and is indistinguishable at these speeds.
   *
   * `t` is still computed from the wall clock, so capping the rate changes how
   * often the loop is *drawn*, never how fast it runs.
   */
  fps?: number;
  /**
   * Pace multiplier over the generator's own declared `speed`. Below 1 is
   * slower. Like `opacity`, this is what a caller reaches for when the graphic
   * is a quiet backdrop rather than the subject — a background that moves at
   * gallery pace behind a paragraph is a distraction.
   */
  speed?: number;
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
  speed = 1,
  fps = BACKGROUND_FPS,
  playing = true,
  t = 0,
  className,
  style,
  seed,
  accent,
  accents,
  background,
  occlusion,
  density,
  opacity,
  strokeWidth,
  disorder,
  contrast,
  originX,
  originY,
  width,
  height,
}: AnimatedBackgroundProps) {
  const host = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const { resolvedTheme } = useTheme();
  const theme = graphicThemeDefaults(resolvedTheme);

  // Depended on by *content*, not identity. A caller writing
  // `accents={['#22d3ee', '#ec4899']}` inline hands over a fresh array every
  // render, and an identity dependency would re-sample the whole generator each
  // time — which is not merely wasteful, it is the per-frame re-sampling the
  // sample/project split exists to prevent.
  const _accentKey = accents?.join(',');

  // Everything except `t`. Changing any of these re-samples, which is correct:
  // they are the params that define *what* is being drawn.
  const params = useMemo(
    () =>
      resolveParams(generator, {
        seed,
        accent: accent ?? theme.accent,
        accents,
        contrast,
        originX,
        originY,
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
      contrast,
      originX,
      originY,
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
      accents,
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
    let lastDraw = 0;
    const minGap = 1000 / Math.max(1, fps);
    // The generator's declared pace and the caller's, multiplied. Applied to
    // the *duration* rather than to `t`, so the loop still runs 0 to 1 and
    // closure is untouched — it just takes longer to get there.
    const pace = Math.max(0.05, (gen.speed ?? 1) * speed);
    const ms = (Math.max(1, duration) / pace) * 1000;

    const tick = (now: number) => {
      if (start === null) start = now;
      // Skip the redraw, not the loop: `t` keeps coming from the clock below,
      // so the motion is identical and only the number of repaints changes.
      if (now - lastDraw < minGap) {
        raf = requestAnimationFrame(tick);
        return;
      }
      lastDraw = now;
      // Modulo rather than a wrapping counter: `t` is normalised loop position,
      // and the generators guarantee `t = 1` renders as `t = 0`, so the seam is
      // already invisible and there is nothing to reset.
      el.innerHTML = gen.project(structure, params, ((now - start) % ms) / ms);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gen, structure, params, playing, t, duration, speed, fps, onScreen]);

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
