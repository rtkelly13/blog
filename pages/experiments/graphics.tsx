import { Check, Copy, Dice5, Sparkles } from 'lucide-react';
import { useState } from 'react';
import {
  ACCENT_SWATCHES,
  GENERATOR_LIST,
  GeneratedBackground,
} from '@/components/graphics';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

function frontmatterSnippet(
  name: string,
  seed: number,
  accent: string,
): string {
  return [
    'background:',
    `  generator: ${name}`,
    `  seed: ${seed}`,
    `  accent: '${accent}'`,
    '  opacity: 0.18',
  ].join('\n');
}

export default function GraphicsGallery() {
  const [accent, setAccent] = useState('#22d3ee');
  const [seed, setSeed] = useState(7);
  const [density, setDensity] = useState(0.5);
  const [selected, setSelected] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shuffle = () => setSeed(Math.floor(Math.random() * 9999));

  const copy = async (name: string) => {
    try {
      await navigator.clipboard.writeText(
        frontmatterSnippet(name, seed, accent),
      );
      setSelected(name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setSelected(name);
    }
  };

  return (
    <>
      <PageSEO
        title={`Graphics Generators - ${siteMetadata.author}`}
        description="Standardised, seed-driven SVG background and graphic generators"
      />
      <div className="border-2 border-white bg-black">
        {/* Header */}
        <div className="border-b-2 border-white bg-zinc-900 px-6 pt-8 pb-8">
          <div className="mb-4 flex items-center gap-4">
            <Sparkles className="h-9 w-9 text-brutalist-cyan" />
            <h1 className="font-display text-4xl font-bold uppercase text-white md:text-5xl">
              [ GRAPHICS_GENERATORS ]
            </h1>
          </div>
          <p className="font-mono text-sm text-zinc-400">
            <span className="text-brutalist-yellow">&gt;</span> Deterministic,
            seed-driven SVG generators. Same seed + params ⇒ identical output —
            usable as talk backgrounds, hero art, or exported assets.
          </p>
          <p className="mt-2 font-mono text-xs text-zinc-500">
            <span className="text-brutalist-cyan">&gt;</span> Tune the controls,
            then copy a generator's config straight into a talk's frontmatter.
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
              Seed · {seed}
            </div>
            <button
              type="button"
              onClick={shuffle}
              className="flex items-center gap-2 border-2 border-white bg-zinc-900 px-3 py-1.5 font-mono text-xs uppercase text-white transition-colors hover:border-brutalist-cyan hover:text-brutalist-cyan"
            >
              <Dice5 className="h-4 w-4" /> Shuffle
            </button>
          </div>

          <div className="min-w-[180px]">
            <div className="mb-2 font-mono text-xs uppercase text-zinc-400">
              Density · {density.toFixed(2)}
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="w-full accent-brutalist-cyan"
            />
          </div>
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
          {GENERATOR_LIST.map((gen) => (
            <div
              key={gen.name}
              className={`border-2 bg-black transition-colors ${
                selected === gen.name ? 'border-brutalist-cyan' : 'border-white'
              }`}
            >
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <GeneratedBackground
                  generator={gen.name}
                  seed={seed}
                  accent={accent}
                  density={density}
                  background="#000000"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                  }}
                />
              </div>
              <div className="flex items-start justify-between gap-4 border-t-2 border-white p-4">
                <div>
                  <h3 className="font-display text-lg font-bold uppercase text-white">
                    {gen.label}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-zinc-400">
                    {gen.description}
                  </p>
                  <code className="mt-2 inline-block font-mono text-xs text-brutalist-yellow">
                    {gen.name}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => copy(gen.name)}
                  className="flex shrink-0 items-center gap-1.5 border-2 border-white bg-zinc-900 px-2.5 py-1.5 font-mono text-xs uppercase text-white transition-colors hover:border-brutalist-cyan hover:text-brutalist-cyan"
                >
                  {copied && selected === gen.name ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Config
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Usage */}
        <div className="border-t-2 border-brutalist-yellow bg-zinc-900 p-6">
          <h2 className="mb-3 font-display text-lg font-bold uppercase text-brutalist-yellow">
            [ HOW_TO_USE ]
          </h2>
          <div className="space-y-3 font-mono text-xs text-white">
            <p>
              <span className="text-brutalist-cyan">&gt;</span> In a talk's MDX
              frontmatter, add a{' '}
              <code className="text-brutalist-yellow">background</code> block
              (copy it from any card above):
            </p>
            <pre className="overflow-x-auto border-2 border-white bg-black p-3 text-brutalist-cyan">
              {frontmatterSnippet('node-network', seed, accent)}
            </pre>
            <p className="text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> Or render inline
              anywhere:{' '}
              <code className="text-brutalist-yellow">
                {'<GeneratedBackground generator="contour" accent="#39ff14" />'}
              </code>
            </p>
            <p className="text-zinc-500">
              <span className="text-brutalist-cyan">&gt;</span> Generators live
              in <code>components/graphics/</code> as pure{' '}
              <code>(params) =&gt; svgString</code> functions.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/experiments"
              className="font-mono text-xs uppercase text-brutalist-cyan hover:text-brutalist-pink"
            >
              ← Back to experiments
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
