import { Pause, Play, Radio, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeneratorGroup } from '@/components/graphics';
import {
  ACCENT_SWATCHES,
  AnimatedBackground,
  GENERATOR_GROUPS,
  generatorsInGroup,
  SURFACES,
} from '@/components/graphics';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * The animation half of the graphics work, which nothing on the site showed.
 *
 * `/experiments/graphics` is the still gallery: it renders each generator once
 * and copies a frontmatter snippet. It has no time control at all, so the
 * sample/project split — the entire point of which is that `t` can be driven
 * per frame — was only ever visible through the Remotion renderer or the test
 * suite. This page drives it in the browser.
 */
/**
 * What each family is for, in one line. Shown under its heading — a gallery of
 * thirty-odd tiles is a wall without them, and the grouping is only useful if
 * the reader can tell why two things are neighbours.
 */
const GROUP_BLURB: Record<GeneratorGroup, string> = {
  lattice:
    'Regular tilings and grids. Edge-to-edge texture that sits behind anything.',
  field:
    'Marks driven by a field rather than a grid — flow, interference, networks.',
  radial:
    'Built about a centre, so they can sit behind a title rather than merely under it.',
  terrain:
    'Layered silhouettes and height fields. Depth by occlusion and contrast.',
  isometric:
    'Stacked geometry with opaque faces, so nearer solids hide farther ones.',
};

/**
 * Ramps offered in the lab. The first is a single accent, which is the historic
 * behaviour and byte-identical to it — everything else is a genuine gradient
 * with the *generator's own axis* driving position, not decoration laid over
 * the top.
 */
const RAMPS: { label: string; colours: string[] | undefined }[] = [
  { label: 'single', colours: undefined },
  { label: 'cyan→pink', colours: ['#22d3ee', '#ec4899'] },
  { label: 'yellow→pink→cyan', colours: ['#facc15', '#ec4899', '#22d3ee'] },
  { label: 'green→cyan', colours: ['#39ff14', '#22d3ee'] },
  { label: 'pink→yellow', colours: ['#ec4899', '#facc15'] },
];

export default function BackgroundsLab() {
  const [accent, setAccent] = useState('#22d3ee');
  const [seed, setSeed] = useState(7);
  const [density, setDensity] = useState(0.55);
  const [disorder, setDisorder] = useState(0);
  const [duration, setDuration] = useState(12);
  const [speed, setSpeed] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [ramp, setRamp] = useState(0);
  const [origin, setOrigin] = useState<[number, number]>([0.5, 0.5]);
  // Side-by-side against the classic single-accent render. The new options are
  // all additive — a test pins that omitting them reproduces the old output
  // byte for byte — so the honest way to show what they add is to show both.
  const [compare, setCompare] = useState(false);
  const [fps, setFps] = useState(24);
  const [playing, setPlaying] = useState(true);
  const [scrub, setScrub] = useState(0);
  // Per-tile overrides on top of the global transport. A name present here wins
  // over `playing`; the global buttons clear the map so they always mean what
  // they say rather than being silently countermanded by a stale override.
  const [solo, setSolo] = useState<Record<string, boolean>>({});
  const [only, setOnly] = useState<GeneratorGroup | 'all'>('all');

  // Only the two tiles nearest the middle of the viewport run.
  //
  // Gating on intersection alone still left everything on screen animating, and
  // on a tall window that is four or five independent rAF loops each
  // re-serialising a few thousand SVG elements. Two is what a reader is
  // actually looking at. The rest hold their last frame, which is why scrolling
  // back to one does not visibly restart it.
  const [central, setCentral] = useState<string[]>([]);
  const tiles = useRef(new Map<string, HTMLElement>());
  const frame = useRef(0);

  const measure = useCallback(() => {
    const mid = window.innerHeight / 2;
    const ranked = [...tiles.current.entries()]
      .map(([name, el]) => {
        const r = el.getBoundingClientRect();
        return { name, d: Math.abs(r.top + r.height / 2 - mid) };
      })
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .map((x) => x.name);
    // Only commit when the pair actually changes — this runs on every scroll
    // frame, and setting identical state would re-render the whole gallery.
    setCentral((prev) =>
      prev.length === ranked.length && prev.every((n, i) => n === ranked[i])
        ? prev
        : ranked,
    );
  }, []);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(measure);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [measure]);

  // A per-tile override always wins, so Play on a tile means Play even when it
  // is nowhere near the middle.
  const isPlaying = (name: string) =>
    solo[name] ?? (playing && central.includes(name));
  const toggleOne = (name: string) =>
    setSolo((prev) => ({ ...prev, [name]: !(prev[name] ?? playing) }));
  const setAll = (next: boolean) => {
    setPlaying(next);
    setSolo({});
  };

  const shared = {
    seed,
    accent,
    density,
    disorder,
    occlusion: SURFACES.darkBg,
    duration,
    speed,
    fps,
    contrast,
    accents: RAMPS[ramp].colours,
    originX: origin[0],
    originY: origin[1],
    t: scrub,
    // 16:9, because that is what these are *for* — talk slides via
    // SpectacleDeck and full-bleed page headers. Previewing them square was
    // misrepresenting them: the landscape generators in particular squeeze
    // their horizontal detail into a narrower frame and read as repetitive.
    width: 1280,
    height: 720,
  };

  /** The classic render: accent only, no ramp, no contrast, centred. */
  const baseline = {
    ...shared,
    accents: undefined,
    contrast: 1,
    originX: 0.5,
    originY: 0.5,
  };

  return (
    <>
      <PageSEO
        title={`Backgrounds Lab - ${siteMetadata.author}`}
        description="Every background generator, animated — sampled once and projected per frame"
      />
      <div className="border-2 border-white bg-black">
        <div className="border-b-2 border-white bg-zinc-900 px-6 pt-8 pb-8">
          <div className="mb-4 flex items-center gap-4">
            <Radio className="h-9 w-9 text-brutalist-cyan" />
            <h1 className="font-display text-4xl font-bold uppercase text-white md:text-5xl">
              [ BACKGROUNDS_LAB ]
            </h1>
          </div>
          <p className="max-w-3xl font-mono text-sm text-zinc-400">
            <span className="text-brutalist-yellow">&gt;</span> Every generator
            animated. Each one is sampled <em>once</em> and projected per frame,
            so the structure on screen is provably the same structure from one
            frame to the next — adjacent <code>t</code> gives adjacent images,
            not an independent roll of the dice.
          </p>
          <p className="mt-2 max-w-3xl font-mono text-xs text-zinc-500">
            <span className="text-brutalist-cyan">&gt;</span> Grouped by family.
            Speed multiplies each generator&rsquo;s own declared pace — the
            radial ones run slower by default, because a turn at full reach
            covers the whole circumference. Only the two tiles nearest the
            middle of the window run — the outlined ones — so scroll to drive
            the rest, or hit Play on any tile to pin it. Every loop closes:
            <code> t = 1</code> renders identically to <code>t = 0</code>, so
            nothing seams. Pause to scrub a single loop by hand.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-8 border-b-2 border-white bg-black px-6 py-6">
          <div>
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Accent
            </div>
            <div className="flex gap-2">
              {ACCENT_SWATCHES.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  aria-label={s.name}
                  onClick={() => setAccent(s.value)}
                  className={`h-8 w-8 border-2 transition-transform ${
                    accent === s.value
                      ? 'scale-110 border-white'
                      : 'border-zinc-700 hover:border-zinc-400'
                  }`}
                  style={{ backgroundColor: s.value }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Transport
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAll(!playing)}
                className="flex items-center gap-2 border-2 border-white bg-zinc-900 px-3 py-1.5 font-mono text-xs uppercase text-white hover:border-brutalist-cyan hover:text-brutalist-cyan"
              >
                {playing ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Play
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSeed(Math.floor(Math.random() * 9999))}
                className="flex items-center gap-2 border-2 border-white bg-zinc-900 px-3 py-1.5 font-mono text-xs uppercase text-white hover:border-brutalist-cyan hover:text-brutalist-cyan"
              >
                <RotateCcw className="h-4 w-4" /> Seed {seed}
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Family
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', ...GENERATOR_GROUPS] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setOnly(g)}
                  className={`border-2 px-2.5 py-1 font-mono text-xs uppercase ${
                    only === g
                      ? 'border-brutalist-cyan bg-zinc-900 text-brutalist-cyan'
                      : 'border-zinc-700 bg-black text-zinc-400 hover:border-zinc-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <label className="min-w-[190px]">
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Scrub · t = {scrub.toFixed(3)}
              {playing && <span className="text-zinc-600"> (paused only)</span>}
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={scrub}
              disabled={playing}
              onChange={(e) => setScrub(Number(e.target.value))}
              className="w-full accent-brutalist-cyan disabled:opacity-40"
            />
          </label>

          <label className="min-w-[150px]">
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Loop · {duration}s
            </div>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-brutalist-cyan"
            />
          </label>

          <div>
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Ramp
            </div>
            <div className="flex flex-wrap gap-2">
              {RAMPS.map((r, i) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setRamp(i)}
                  className={`flex items-center gap-2 border-2 px-2 py-1 font-mono text-[10px] uppercase ${
                    ramp === i
                      ? 'border-brutalist-cyan text-brutalist-cyan'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-400'
                  }`}
                >
                  <span
                    className="h-3 w-8 border border-zinc-600"
                    style={{
                      background: r.colours
                        ? `linear-gradient(90deg, ${r.colours.join(', ')})`
                        : accent,
                    }}
                  />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Origin · {origin[0].toFixed(2)}, {origin[1].toFixed(2)}
            </div>
            <div className="flex gap-2">
              {(
                [
                  ['centre', [0.5, 0.5]],
                  ['left', [0.22, 0.5]],
                  ['right', [0.78, 0.5]],
                  ['low', [0.5, 0.8]],
                ] as const
              ).map(([label, o]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setOrigin([o[0], o[1]])}
                  className={`border-2 px-2 py-1 font-mono text-[10px] uppercase ${
                    origin[0] === o[0] && origin[1] === o[1]
                      ? 'border-brutalist-cyan text-brutalist-cyan'
                      : 'border-zinc-700 text-zinc-400 hover:border-zinc-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Compare
            </div>
            <button
              type="button"
              onClick={() => setCompare((v) => !v)}
              className={`border-2 px-3 py-1.5 font-mono text-xs uppercase ${
                compare
                  ? 'border-brutalist-cyan bg-zinc-900 text-brutalist-cyan'
                  : 'border-zinc-700 bg-black text-zinc-400 hover:border-zinc-400'
              }`}
            >
              {compare ? 'split on' : 'split off'}
            </button>
          </div>

          <label className="min-w-[150px]">
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Contrast · {contrast.toFixed(2)}
            </div>
            <input
              type="range"
              min={0.2}
              max={1.8}
              step={0.05}
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full accent-brutalist-cyan"
            />
          </label>

          <label className="min-w-[150px]">
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              FPS · {fps}
            </div>
            <input
              type="range"
              min={6}
              max={60}
              step={2}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full accent-brutalist-cyan"
            />
          </label>

          <label className="min-w-[150px]">
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Speed · {speed.toFixed(2)}&times;
            </div>
            <input
              type="range"
              min={0.2}
              max={2}
              step={0.1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full accent-brutalist-cyan"
            />
          </label>

          <label className="min-w-[150px]">
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Density · {density.toFixed(2)}
            </div>
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.05}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="w-full accent-brutalist-cyan"
            />
          </label>

          <label className="min-w-[150px]">
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Disorder · {disorder.toFixed(2)}
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={disorder}
              onChange={(e) => setDisorder(Number(e.target.value))}
              className="w-full accent-brutalist-cyan"
            />
          </label>
        </div>

        <p className="border-b-2 border-white bg-zinc-950 px-6 py-3 font-mono text-xs text-zinc-500">
          <span className="text-brutalist-yellow">&gt;</span> Density and
          disorder both re-sample — they change <em>what</em> is drawn, not
          where it is in its loop, so they are deliberately not animatable. Only{' '}
          <code>t</code> is.
        </p>

        {GENERATOR_GROUPS.filter(
          (group) => only === 'all' || only === group,
        ).map((group) => {
          const inGroup = generatorsInGroup(group);
          if (inGroup.length === 0) return null;
          return (
            <section key={group}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-y-2 border-white bg-zinc-900 px-6 py-4">
                <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">
                  [ {group} ]
                </h2>
                <span className="font-mono text-xs text-brutalist-cyan">
                  {inGroup.length}
                </span>
                <p className="font-mono text-xs text-zinc-400">
                  {GROUP_BLURB[group]}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 bg-zinc-800 p-2 lg:grid-cols-2">
                {inGroup.map((g) => (
                  <figure
                    key={g.name}
                    ref={(el) => {
                      if (el) tiles.current.set(g.name, el);
                      else tiles.current.delete(g.name);
                    }}
                    className={`bg-black transition-shadow ${
                      central.includes(g.name)
                        ? 'shadow-[inset_0_0_0_2px_var(--brutalist-cyan,#22d3ee)]'
                        : ''
                    }`}
                  >
                    <div className="flex aspect-video overflow-hidden">
                      {compare && (
                        <div className="relative w-1/2 border-r-2 border-zinc-700">
                          <AnimatedBackground
                            generator={g.name}
                            {...baseline}
                            playing={isPlaying(g.name)}
                            className="h-full w-full"
                          />
                          <span className="absolute bottom-1 left-1 bg-black/70 px-1 font-mono text-[9px] uppercase text-zinc-500">
                            accent only
                          </span>
                        </div>
                      )}
                      <div className={compare ? 'relative w-1/2' : 'w-full'}>
                        <AnimatedBackground
                          generator={g.name}
                          {...shared}
                          playing={isPlaying(g.name)}
                          className="h-full w-full"
                        />
                        {compare && (
                          <span className="absolute bottom-1 left-1 bg-black/70 px-1 font-mono text-[9px] uppercase text-brutalist-cyan">
                            with options
                          </span>
                        )}
                      </div>
                    </div>
                    <figcaption className="border-t-2 border-zinc-800 p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-display text-lg font-bold uppercase text-white">
                          {g.label}
                        </h3>
                        <div className="flex items-center gap-3">
                          <code className="font-mono text-xs text-brutalist-cyan">
                            {g.name}
                          </code>
                          <button
                            type="button"
                            onClick={() => toggleOne(g.name)}
                            aria-label={`${isPlaying(g.name) ? 'Pause' : 'Play'} ${g.label}`}
                            className="flex items-center gap-1.5 border-2 border-zinc-700 bg-black px-2 py-1 font-mono text-[10px] uppercase text-zinc-400 hover:border-brutalist-cyan hover:text-brutalist-cyan"
                          >
                            {isPlaying(g.name) ? (
                              <>
                                <Pause className="h-3 w-3" /> Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" /> Play
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 font-mono text-xs text-zinc-400">
                        {g.description}
                      </p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
