import {
  isThemeLevel,
  LEVELS,
  type ThemeLevel,
} from '@rtkelly13/design-system';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { getGenerator, resolveParams } from '@/components/graphics';
import { graphicThemeDefaults } from '@/components/graphics/palette';
import type { GraphicParams } from '@/components/graphics/types';

/**
 * The homepage's first screen: a landscape drawn by the site's own generators
 * rather than a fixed illustration.
 *
 * Three layers, back to front — a `node-network` constellation for the sky, a
 * striped sun, and a `ridgeline` range — all sampled once from one seed and
 * then projected per frame, which is the split `components/graphics/types.ts`
 * exists for. The seed is the visitor's calendar day, so the picture changes
 * daily and REROLL draws another.
 *
 * Under automation (`navigator.webdriver`) or `prefers-reduced-motion` the
 * image holds still at `t = 0`; automation also pins the seed, so the visual
 * baselines don't move with the date.
 */

/** viewBox width; height follows the hero's measured aspect ratio. */
const VIEW_WIDTH = 1600;
/** Seconds for one full loop of `t`. Ridges drift; the sky barely does. */
const LOOP_SECONDS = 90;
/** Redraws per second — the drift is slow, 60fps buys nothing. */
const FPS = 24;
/** Share of the hero, from the bottom, that the mountain range occupies. */
const RIDGE_SHARE = 0.55;
/**
 * Narrowest the range is drawn, in CSS px. Below this a phone would squeeze a
 * desktop's worth of peaks into 390px, so the range overflows and is centred.
 */
const RIDGE_MIN_PX = 900;
/** Seed used when a test driver is at the wheel. */
const PINNED_SEED = 20240101;

const daySeed = (d = new Date()) =>
  d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();

interface Layer {
  generator: string;
  params: Partial<GraphicParams>;
}

function layersFor(level: ThemeLevel, accent: string): Layer[] {
  const palette = LEVELS[level].palette;
  return [
    {
      generator: 'node-network',
      params: { accent: palette.violet, density: 0.45, opacity: 0.55 },
    },
    {
      generator: 'ridgeline',
      params: { accent, density: 0.6, strokeWidth: 2 },
    },
  ];
}

/**
 * Flatten every translucent `rgba()` fill onto `ground`, so each ridge hides
 * whatever sits behind it — the sun included — while keeping its tint.
 * Strokes are left translucent; they carry the depth cue.
 */
function opaqueFills(svg: string, ground: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(ground.trim());
  if (!m) return svg;
  const g = [m[1], m[2], m[3]].map((h) => Number.parseInt(h, 16));
  return svg.replace(
    /fill="rgba\((\d+), (\d+), (\d+), ([\d.]+)\)"/g,
    (_, r, gr, b, a) => {
      const alpha = Number(a);
      const mix = [r, gr, b].map((c, i) =>
        Math.round(Number(c) * alpha + g[i] * (1 - alpha)),
      );
      return `fill="rgb(${mix.join(', ')})"`;
    },
  );
}

/** Retro sun: a disc with horizontal bands cut out of its lower half. */
function sunSvg(width: number, height: number, colour: string): string {
  const r = Math.min(width, height) * 0.2;
  const cx = width / 2;
  const cy = height * 0.52;
  let cuts = '';
  for (let i = 0; i < 7; i++) {
    const y = cy + r * (0.05 + i * 0.14);
    const h = r * (0.02 + i * 0.012);
    cuts += `<rect x="${cx - r}" y="${y}" width="${r * 2}" height="${h}" fill="black"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"><defs><mask id="hero-sun-cuts"><rect width="${width}" height="${height}" fill="white"/>${cuts}</mask></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="${colour}" mask="url(#hero-sun-cuts)"/><circle cx="${cx}" cy="${cy}" r="${r * 1.12}" fill="none" stroke="${colour}" stroke-width="3" opacity="0.35"/></svg>`;
}

export default function GeneratedHero() {
  const rootRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const ridgeRef = useRef<HTMLDivElement>(null);

  const { resolvedTheme } = useTheme();
  const level: ThemeLevel = isThemeLevel(resolvedTheme)
    ? resolvedTheme
    : 'midnight';

  const [seed, setSeed] = useState<number | null>(null);
  const [still, setStill] = useState(true);
  const [box, setBox] = useState({ width: 1600, height: 900 });
  const [scrollY, setScrollY] = useState(0);

  // Client-only decisions: the date, the test driver, and motion preference.
  // Leaving `seed` null on the server keeps SSR output date-independent.
  useEffect(() => {
    const automated = navigator.webdriver === true;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    setSeed(automated ? PINNED_SEED : daySeed());
    setStill(automated || reduced);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setBox({ width: Math.round(width), height: Math.round(height) });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sample once per (seed, theme, size); project per frame.
  useEffect(() => {
    if (seed === null) return;
    const { accent } = graphicThemeDefaults(level);
    const ground = LEVELS[level].surface.base;
    const height = Math.round((VIEW_WIDTH * box.height) / box.width);
    const ridgePx = Math.max(box.width, RIDGE_MIN_PX);
    const ridgeHeight = Math.round(
      (VIEW_WIDTH * box.height * RIDGE_SHARE) / ridgePx,
    );
    const size = { width: VIEW_WIDTH, height, seed };

    const [skyLayer, ridgeLayer] = layersFor(level, accent).map((layer) => {
      const gen = getGenerator(layer.generator);
      if (!gen) return null;
      const params = resolveParams(layer.generator, {
        ...layer.params,
        ...size,
        ...(layer.generator === 'ridgeline' && {
          height: ridgeHeight,
        }),
      });
      return { gen, params, structure: gen.sample(params) };
    });

    if (sunRef.current) {
      sunRef.current.innerHTML = sunSvg(
        VIEW_WIDTH,
        height,
        LEVELS[level].palette.pink,
      );
    }

    const draw = (t: number) => {
      if (skyLayer && skyRef.current) {
        // The sky turns over once while the ridges loop three times.
        skyRef.current.innerHTML = skyLayer.gen.project(
          skyLayer.structure,
          skyLayer.params,
          (t / 3) % 1,
        );
      }
      if (ridgeLayer && ridgeRef.current) {
        ridgeRef.current.innerHTML = opaqueFills(
          ridgeLayer.gen.project(ridgeLayer.structure, ridgeLayer.params, t),
          ground,
        );
      }
    };

    draw(0);
    if (still) return;

    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 1000 / FPS) return;
      last = now;
      draw((((now - start) / 1000) % (LOOP_SECONDS * 3)) / LOOP_SECONDS);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seed, level, box, still]);

  const layer =
    'pointer-events-none absolute inset-0 [&>svg]:h-full [&>svg]:w-full';

  return (
    <section
      ref={rootRef}
      aria-labelledby="home-hero-title"
      className="relative -mt-[6rem] h-screen min-h-[32rem] w-full overflow-hidden bg-surface-base"
      style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}
    >
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: seed === null ? 0 : 1 }}
      >
        <div ref={skyRef} aria-hidden className={layer} />
        <div ref={sunRef} aria-hidden className={layer} />
        <div
          ref={ridgeRef}
          aria-hidden
          className={layer}
          style={{
            top: `${(1 - RIDGE_SHARE) * 100}%`,
            left: '50%',
            right: 'auto',
            width: `max(100%, ${RIDGE_MIN_PX}px)`,
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      {/* Name plate */}
      <div
        className="absolute inset-x-0 top-[30%] z-10 flex -translate-y-1/2 flex-col items-center px-4 text-center"
        style={{ transform: `translateY(calc(-50% + ${scrollY * 0.2}px))` }}
      >
        <h1
          id="home-hero-title"
          className="mb-3 border-2 border-white bg-black px-5 py-2 font-display text-5xl font-bold tracking-widest text-white shadow-hard-md md:text-7xl lg:text-8xl"
        >
          RYAN KELLY
        </h1>
        <p className="border-2 border-white bg-black px-4 py-1 font-mono text-base text-accent-primary md:text-xl">
          {'>'} FULL_STACK_ENGINEER.exe
        </p>
      </div>

      {/* Figure caption: what was drawn, and a way to draw another. */}
      <div className="absolute bottom-6 left-4 z-20 flex items-stretch font-mono text-xs uppercase md:bottom-10 md:left-10 md:text-sm">
        <span className="border-2 border-white bg-black px-3 py-2 text-zinc-400">
          <span className="hidden sm:inline">
            {'FIG.01 // GENERATED // RIDGELINE × NODE-NETWORK // '}
          </span>
          {'SEED '}
          <span className="text-white">{seed ?? '--------'}</span>
        </span>
        <button
          type="button"
          onClick={() => setSeed(Math.floor(Math.random() * 1e8))}
          disabled={seed === null}
          className="-ml-[2px] border-2 border-white bg-black px-3 py-2 font-bold text-accent-primary shadow-hard-sm transition-all hover:border-accent-primary hover:shadow-hard-accent-primary active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
        >
          [ REROLL ]
        </button>
      </div>

      {/* Scroll cue */}
      <div
        className="absolute bottom-6 right-4 z-20 hidden border-2 border-white bg-black px-3 py-2 font-pixel text-xl uppercase tracking-widest text-accent-primary transition-opacity duration-300 md:bottom-10 md:right-10 md:block"
        style={{ opacity: scrollY > 100 ? 0 : 1 }}
        aria-hidden
      >
        ↓ SCROLL
      </div>
    </section>
  );
}
