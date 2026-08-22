import { useState } from 'react';
import { HERO_IDEAS, ShaderStage, type ShaderStatus } from '@/components/hero';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * WebGL hero research prototype.
 *
 * The question this page exists to answer: does the homepage hero want a 3D
 * engine (three.js / react-three-fiber), or does the look it actually has —
 * a perspective grid and a glowing ring — come out of one fragment shader for
 * a fraction of the bytes? Measurements and the verdict live in
 * docs/hero-webgl-research.md; this page is the working end of it.
 *
 * Here the hero follows the page's own theme, the way a shipped one would.
 * To see an idea's two readings side by side, and five more ideas besides,
 * go to /design-sandbox/hero-lab.
 */

const SYNTHWAVE = HERO_IDEAS.find((idea) => idea.id === 'synthwave');

/**
 * The CSS backdrop that shows through when WebGL is unavailable — and that the
 * shader composites over the rest of the time, so the two never disagree about
 * the background colour.
 */
function HeroBackdrop({ flat }: { flat: boolean }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        background: 'var(--brutalist-darkBg, #0a0a0a)',
        backgroundImage: flat
          ? `linear-gradient(to right, var(--hero-grid, rgba(57,255,20,0.1)) 1px, transparent 1px),
             linear-gradient(to bottom, var(--hero-grid, rgba(57,255,20,0.1)) 1px, transparent 1px)`
          : undefined,
        backgroundSize: flat ? '50px 50px' : undefined,
      }}
    />
  );
}

const STATUS_LABEL: Record<ShaderStatus, string> = {
  pending: 'starting…',
  running: 'webgl2 · animating',
  still: 'webgl2 · reduced-motion still frame',
  unsupported: 'css fallback (no webgl2)',
};

function ShaderHero() {
  const [status, setStatus] = useState<ShaderStatus>('pending');

  return (
    <div className="relative h-[60vh] min-h-[320px] w-full overflow-hidden border-2 border-white">
      <HeroBackdrop flat={status === 'unsupported'} />
      <ShaderStage
        hero={SYNTHWAVE?.variants[0].hero ?? ''}
        mode="follow"
        onStatus={setStatus}
        className="absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <h2 className="font-display text-4xl font-bold uppercase text-white md:text-6xl">
          RYAN KELLY
        </h2>
        <p className="mt-3 font-mono text-sm text-brutalist-cyan md:text-base">
          FULL_STACK_ENGINEER.exe
        </p>
      </div>
      <p className="absolute bottom-3 left-3 font-mono text-xs text-zinc-400">
        {'>'} renderer: {STATUS_LABEL[status]}
      </p>
    </div>
  );
}

/**
 * Measured on this repo at three@0.185.1 / @react-three/fiber@9.7.0 /
 * ogl@1.0.11 — esbuild, minified, gzipped, react + react-dom external.
 * Method and caveats: docs/hero-webgl-research.md.
 */
const COSTS: { approach: string; gzip: string; note: string }[] = [
  {
    approach: 'raw WebGL2 (this page)',
    gzip: '0.8 KB',
    note: 'One fragment shader. No dependency, no lazy chunk worth splitting.',
  },
  {
    approach: 'ogl',
    gzip: '13.0 KB',
    note: 'Thin WebGL wrapper. Worth it once there is real geometry to manage.',
  },
  {
    approach: 'three.js',
    gzip: '129.6 KB',
    note: 'A minimal scene still pulls the core renderer; it barely tree-shakes.',
  },
  {
    approach: 'react-three-fiber + three',
    gzip: '237.9 KB',
    note: 'Adds its own reconciler on top of three. Pays off with scene graphs, not backdrops.',
  },
];

export default function WebglHeroes() {
  return (
    <>
      <PageSEO
        title={`WebGL Heroes - ${siteMetadata.author}`}
        description="Shader-driven hero prototype, and what a 3D engine would cost instead"
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="WEBGL_HEROES"
          subtitle="Shader-driven hero prototype, and what a 3D engine would cost instead"
        />

        <div className="container py-12">
          <ShaderHero />

          <div className="mt-8 border-2 border-brutalist-yellow bg-zinc-900 p-6">
            <h3 className="mb-4 font-display text-xl font-bold uppercase text-brutalist-yellow">
              [ WHAT_IT_COSTS ]
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="text-left text-zinc-400">
                    <th className="py-2 pr-4 font-normal">APPROACH</th>
                    <th className="py-2 pr-4 font-normal">GZIP</th>
                    <th className="py-2 font-normal">NOTE</th>
                  </tr>
                </thead>
                <tbody>
                  {COSTS.map((row) => (
                    <tr
                      key={row.approach}
                      className="border-t border-zinc-700 align-top"
                    >
                      <td className="py-2 pr-4 text-white">{row.approach}</td>
                      <td className="py-2 pr-4 text-brutalist-cyan">
                        {row.gzip}
                      </td>
                      <td className="py-2 text-zinc-400">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 font-mono text-sm leading-relaxed text-zinc-400">
              {'>'} The homepage ships ~230 KB gzip of JS today, so three.js is
              a 56% increase for a backdrop.
              <br />
              {'>'} Full method, per-theme behaviour, and the case for picking
              three.js anyway live in{' '}
              <Link
                href="https://github.com/rtkelly13/blog/blob/main/docs/hero-webgl-research.md"
                className="text-brutalist-cyan"
              >
                docs/hero-webgl-research.md
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 border-2 border-white bg-zinc-900 p-6">
            <h3 className="mb-4 font-display text-xl font-bold uppercase text-white">
              [ TRY_IT ]
            </h3>
            <p className="font-mono text-sm leading-relaxed text-zinc-400">
              {'>'} Cycle the theme (HIGH → DIM → SKETCH) — the shader reads the
              same <span className="text-white">--hero-*</span> tokens CyberHero
              does, so the palette follows.
              <br />
              {'>'} Turn on reduced motion — the loop stops and one still frame
              is drawn.
              <br />
              {'>'} Scroll it out of view or background the tab — the render
              loop parks itself.
              <br />
              {'>'} Five more ideas, each showing both themes at once, are in
              the{' '}
              <Link
                href="/design-sandbox/hero-lab"
                className="text-brutalist-cyan"
              >
                hero lab
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
