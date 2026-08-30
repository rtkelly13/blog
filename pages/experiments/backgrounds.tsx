import { Pause, Play, Radio, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import {
  ACCENT_SWATCHES,
  AnimatedBackground,
  GENERATOR_LIST,
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
export default function BackgroundsLab() {
  const [accent, setAccent] = useState('#22d3ee');
  const [seed, setSeed] = useState(7);
  const [density, setDensity] = useState(0.55);
  const [disorder, setDisorder] = useState(0);
  const [duration, setDuration] = useState(12);
  const [playing, setPlaying] = useState(true);
  const [scrub, setScrub] = useState(0);

  const shared = {
    seed,
    accent,
    density,
    disorder,
    occlusion: SURFACES.darkBg,
    duration,
    playing,
    t: scrub,
    width: 640,
    height: 640,
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
            <span className="text-brutalist-cyan">&gt;</span> Every loop closes:
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
                onClick={() => setPlaying((v) => !v)}
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

        <div className="grid grid-cols-1 gap-2 bg-zinc-800 p-2 md:grid-cols-2 xl:grid-cols-3">
          {GENERATOR_LIST.map((g) => (
            <figure key={g.name} className="bg-black">
              <div className="aspect-square overflow-hidden">
                <AnimatedBackground
                  generator={g.name}
                  {...shared}
                  className="h-full w-full"
                />
              </div>
              <figcaption className="border-t-2 border-zinc-800 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-lg font-bold uppercase text-white">
                    {g.label}
                  </h2>
                  <code className="font-mono text-xs text-brutalist-cyan">
                    {g.name}
                  </code>
                </div>
                <p className="mt-1 font-mono text-xs text-zinc-400">
                  {g.description}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </>
  );
}
