import { Radio } from 'lucide-react';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import {
  AnimatedBackground,
  GENERATOR_GROUPS,
  type GeneratorGroup,
  generatorsInGroup,
  PAPER_ACCENTS,
  SURFACES,
} from '@/components/graphics';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';
import { parseGraphicsUrl } from '@/lib/graphicsUrl';

/**
 * Every generator, grouped by family, each a link to its own page.
 *
 * A contact sheet rather than a workbench: the controls live on the detail page
 * where there is room for them, and the only job here is to let someone see all
 * forty-one and pick one. Tiles animate only while near the middle of the
 * viewport, for the reason described in `AnimatedBackground` — `innerHTML`
 * reparse is the cost, and it scales with how many are running.
 */
const GROUP_BLURB: Record<GeneratorGroup, string> = {
  lattice: 'Regular tilings and grids — edge-to-edge texture.',
  field: 'Marks driven by a field rather than a grid.',
  radial: 'Built about a centre, so they can sit behind a title.',
  terrain: 'Layered silhouettes and height fields.',
  isometric: 'Stacked geometry with opaque faces.',
};

export default function BackgroundsGallery() {
  // The same query-string contract the detail page and the visual-regression
  // fixtures use — see `lib/graphicsUrl.ts`. `chrome=0` strips the headings and
  // captions so a snapshot contains the graphics and nothing else, and
  // `playing=0` with an explicit `t` freezes a named frame.
  const router = useRouter();
  const url = parseGraphicsUrl(router.query);
  const { resolvedTheme, setTheme } = useTheme();
  const urlTheme = url.theme;
  useEffect(() => {
    if (urlTheme) setTheme(urlTheme);
  }, [urlTheme, setTheme]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const paper = url.paper ?? (mounted && resolvedTheme === 'sketch');

  const [central, setCentral] = useState<string[]>([]);
  useEffect(() => {
    const measure = () => {
      const mid = window.innerHeight / 2;
      const ranked = [...document.querySelectorAll<HTMLElement>('[data-gen]')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            name: el.dataset.gen ?? '',
            d: Math.abs(r.top + r.height / 2 - mid),
          };
        })
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .map((x) => x.name);
      setCentral((prev) =>
        prev.length === ranked.length && prev.every((n, i) => n === ranked[i])
          ? prev
          : ranked,
      );
    };
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const shared = {
    seed: url.seed,
    density: url.density,
    opacity: url.opacity,
    contrast: url.contrast,
    disorder: url.disorder,
    accent: url.accent ?? (paper ? PAPER_ACCENTS.ink : '#22d3ee'),
    accents: url.accents,
    occlusion: paper ? SURFACES.paper : SURFACES.darkBg,
    speed: url.speed,
    fps: url.fps,
    originX: url.originX,
    originY: url.originY,
    t: url.t,
    width: 1280,
    height: 720,
  };

  return (
    <>
      <PageSEO
        title={`Background gallery - ${siteMetadata.author}`}
        description="Forty-one deterministic, seamlessly looping SVG background generators"
      />
      <div className="border-2 border-white bg-black">
        {url.chrome && (
          <div className="border-b-2 border-white bg-zinc-900 px-6 pt-8 pb-8">
            <div className="mb-4 flex items-center gap-4">
              <Radio className="h-9 w-9 text-brutalist-cyan" />
              <h1 className="font-display text-4xl font-bold uppercase text-white md:text-5xl">
                [ BACKGROUNDS ]
              </h1>
            </div>
            <p className="max-w-3xl font-mono text-sm text-zinc-400">
              <span className="text-brutalist-yellow">&gt;</span> Each one is
              sampled once and projected per frame, so every loop closes with no
              seam. Pick one to configure it.
            </p>
          </div>
        )}

        {GENERATOR_GROUPS.map((group) => {
          const inGroup = url.only.length
            ? generatorsInGroup(group).filter((g) => url.only.includes(g.name))
            : generatorsInGroup(group);
          if (inGroup.length === 0) return null;
          return (
            <section key={group}>
              {url.chrome && (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-y-2 border-white bg-zinc-900 px-6 py-3">
                  <h2 className="font-display text-lg font-bold uppercase text-white">
                    [ {group} ]
                  </h2>
                  <span className="font-mono text-xs text-brutalist-cyan">
                    {inGroup.length}
                  </span>
                  <p className="font-mono text-xs text-zinc-400">
                    {GROUP_BLURB[group]}
                  </p>
                </div>
              )}
              <div
                className={`grid gap-2 bg-zinc-800 p-2 ${url.chrome ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : ''}`}
                style={{
                  // Bare mode obeys `cols` exactly, because a snapshot needs a
                  // fixed layout. With chrome on the grid stays responsive.
                  gridTemplateColumns: url.chrome
                    ? undefined
                    : `repeat(${url.cols}, minmax(0, 1fr))`,
                }}
              >
                {inGroup.map((g) => (
                  <Link
                    key={g.name}
                    href={`/gallery/backgrounds/${g.name}`}
                    data-gen={g.name}
                    className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-brutalist-cyan"
                    style={{ backgroundColor: paper ? SURFACES.paper : '#000' }}
                  >
                    <div className="aspect-video overflow-hidden">
                      <AnimatedBackground
                        generator={g.name}
                        {...shared}
                        playing={url.playing && central.includes(g.name)}
                        className="h-full w-full"
                      />
                    </div>
                    {url.chrome && (
                      <div
                        className="border-t-2 border-zinc-800 p-3"
                        style={{
                          backgroundColor: paper ? SURFACES.paper : '#000',
                        }}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <h3
                            className={`font-display text-base font-bold uppercase ${paper ? 'text-zinc-900' : 'text-white'} group-hover:text-brutalist-cyan`}
                          >
                            {g.label}
                          </h3>
                          <code className="font-mono text-[10px] text-brutalist-cyan">
                            {g.name}
                          </code>
                        </div>
                        <p
                          className={`mt-1 font-mono text-[11px] ${paper ? 'text-zinc-600' : 'text-zinc-400'}`}
                        >
                          {g.description}
                        </p>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
