import { Shapes } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  BakedCorners,
  BrandProvenance,
  CapFixDemo,
  GeometryStrip,
  LicenceLedger,
  PACKS,
  PixelPairing,
  StrokeWeight,
  ThemeSurvival,
  VERDICT_ACCENT,
  VERDICT_LABEL,
} from '@/components/iconlab';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * One argument per panel. `claim` is the thing being asserted, `shown` is
 * what the reader is looking at — kept separate so a panel that stops
 * demonstrating its claim is obvious rather than merely decorative.
 */
function Panel({
  kind,
  title,
  claim,
  children,
}: {
  kind: string;
  title: string;
  claim: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b-2 border-white px-6 py-10">
      <div className="mb-1 flex flex-wrap items-baseline gap-3">
        <span className="bg-brutalist-cyan px-1.5 font-mono text-[10px] font-bold uppercase text-black">
          {kind}
        </span>
        <h2 className="font-display text-2xl font-bold uppercase text-white">
          {title}
        </h2>
      </div>
      <p className="mb-5 max-w-3xl font-mono text-xs text-zinc-400">
        <span className="text-brutalist-yellow">&gt;</span> {claim}
      </p>
      {children}
    </section>
  );
}

const HEADLINE = [
  {
    pack: 'Lucide',
    verdict: 'keep' as const,
    line: 'Already installed, already right on four of five constraints. One CSS rule closes the fifth.',
  },
  {
    pack: 'Simple Icons',
    verdict: 'adopt' as const,
    line: 'Already the source of the social icons — as hand-copied paths. Depend on it instead.',
  },
  {
    pack: 'Pixelarticons',
    verdict: 'accent' as const,
    line: 'MIT pixel glyphs on the same grid as the VT323 logo. Scoped accent, not a replacement.',
  },
];

export default function IconPacksExperiment() {
  const rejected = PACKS.filter((p) => p.verdict === 'pass').length;

  return (
    <>
      <PageSEO
        title={`Icon Packs - ${siteMetadata.author}`}
        description="Public icon packs judged against the brutalist dual-mode design system, with the geometry, theming and licence arguments rendered live"
      />
      <div className="border-2 border-white bg-black">
        <PageHeader
          title="ICON_PACKS"
          icon={Shapes}
          accent="cyan"
          subtitle="Fourteen public packs, judged live against zero radius, 2px borders and a token set that flips to paper"
        />

        {/* ---------------- verdict up front ---------------- */}
        <section className="border-b-2 border-white px-6 py-10">
          <div className="grid gap-4 lg:grid-cols-3">
            {HEADLINE.map((h) => (
              <div
                key={h.pack}
                className="border-2 border-white bg-zinc-900 p-5 shadow-hard-md"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-display text-xl font-bold uppercase text-white">
                    {h.pack}
                  </span>
                  <span
                    className={`border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${VERDICT_ACCENT[h.verdict]}`}
                  >
                    {VERDICT_LABEL[h.verdict]}
                  </span>
                </div>
                <p className="font-mono text-xs leading-relaxed text-zinc-400">
                  {h.line}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-3xl font-mono text-xs text-zinc-400">
            <span className="text-brutalist-pink">&gt;</span> {rejected} packs
            rejected — every one of them a good icon set that disagrees with
            this brief. The panels below are the working, not the write-up: each
            one renders the actual published path data and lets the argument be
            checked rather than believed.
          </p>
        </section>

        <Panel
          kind="constraint 01"
          title="It has to survive the theme flip"
          claim="The design system re-points its colour tokens for sketch mode, so an icon that ships a baked fill colour cannot follow. Both panels below are the same markup — only the theme class differs."
        >
          <ThemeSurvival />
        </Panel>

        <Panel
          kind="constraint 02"
          title="The same arrow, ten ways"
          claim="Every pack claims consistent and geometric. What matters here is narrower: where the stroke terminates, whether corners are arcs, and whether a stylesheet can reach any of it."
        >
          <GeometryStrip />
        </Panel>

        <Panel
          kind="constraint 03"
          title="2px icons in a 2px system"
          claim="Borders in this system are 2px, always. An icon drawn at 1.5px is not lighter by intent — it is a different weight class sitting inside the frame."
        >
          <StrokeWeight />
        </Panel>

        <Panel
          kind="the fix"
          title="One rule, no import sites touched"
          claim="Lucide's round caps are the only real mismatch, and they are set as presentation attributes on the root svg — which CSS outranks. Judge it in chrome, not on a swatch grid."
        >
          <CapFixDemo />
        </Panel>

        <Panel
          kind="the caveat"
          title="What the rule does not fix"
          claim="Squaring the caps does not square the shape. Lucide bakes ~2px corner arcs into the path data, and this is the honest limit of the recommendation."
        >
          <BakedCorners />
        </Panel>

        <Panel
          kind="licence"
          title="What each licence costs a published package"
          claim="The design system publishes to public npm, so a licence is not a footnote — it is an obligation handed to everyone who installs it. Packs grouped by what they actually ask, rather than by whether they call themselves open."
        >
          <LicenceLedger />
        </Panel>

        <Panel
          kind="licence · applied"
          title="Five brand marks, one undeclared"
          claim="The clearest licence finding in the repo is not about a pack it should adopt — it is about art it already vendored by hand."
        >
          <BrandProvenance />
        </Panel>

        <Panel
          kind="the accent"
          title="Pixel glyphs, pixel font, same grid"
          claim="The strongest brand-fit result of the audit, and the one that needs a boundary written down before it drifts site-wide."
        >
          <PixelPairing />
        </Panel>

        {/* ---------------- full matrix ---------------- */}
        <section className="border-b-2 border-white px-6 py-10">
          <div className="mb-1 flex flex-wrap items-baseline gap-3">
            <span className="bg-brutalist-yellow px-1.5 font-mono text-[10px] font-bold uppercase text-black">
              the field
            </span>
            <h2 className="font-display text-2xl font-bold uppercase text-white">
              Every pack, every verdict
            </h2>
          </div>
          <p className="mb-5 max-w-3xl font-mono text-xs text-zinc-400">
            <span className="text-brutalist-yellow">&gt;</span> Counts and
            licences read from each project's own repository, August 2026.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {PACKS.map((pack) => (
              <div
                key={pack.id}
                className="flex flex-col gap-3 border-2 border-white bg-zinc-900 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-lg font-bold uppercase text-white">
                    {pack.name}
                  </span>
                  <span
                    className={`border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${VERDICT_ACCENT[pack.verdict]}`}
                  >
                    {VERDICT_LABEL[pack.verdict]}
                  </span>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-[11px]">
                  <dt className="text-zinc-500">icons</dt>
                  <dd className="text-white">{pack.count}</dd>
                  <dt className="text-zinc-500">licence</dt>
                  <dd className="text-brutalist-cyan">{pack.licence}</dd>
                  <dt className="text-zinc-500">geometry</dt>
                  <dd className="text-zinc-400">{pack.geometry}</dd>
                  <dt className="text-zinc-500">delivery</dt>
                  <dd className="text-zinc-400">{pack.delivery}</dd>
                </dl>

                <p className="font-mono text-xs leading-relaxed text-zinc-400">
                  {pack.why}
                </p>

                <a
                  href={pack.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] uppercase text-brutalist-cyan hover:text-brutalist-pink"
                >
                  source repo
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- attribution ---------------- */}
        <section className="px-6 py-8">
          <h2 className="mb-3 font-display text-lg font-bold uppercase text-white">
            [ SPECIMEN_ATTRIBUTION ]
          </h2>
          <p className="max-w-3xl font-mono text-xs leading-relaxed text-zinc-400">
            Every glyph on this page is unmodified path data from the pack's own
            repository, reproduced here to compare geometry. Lucide (ISC).
            Tabler, Phosphor, Iconoir, Pixelarticons, css.gg and Mono Icons
            (MIT). Material Symbols (Apache-2.0). Simple Icons (CC0-1.0). VS
            Code Codicons (CC BY 4.0) —{' '}
            <a
              href="https://github.com/microsoft/vscode-codicons"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brutalist-cyan hover:text-brutalist-pink"
            >
              microsoft/vscode-codicons
            </a>
            , licensed under{' '}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brutalist-cyan hover:text-brutalist-pink"
            >
              CC BY 4.0
            </a>
            . Reproducing that one specimen is itself the demonstration: this
            paragraph is the obligation the ATTRIBUTION tier describes, and it
            is the reason none of those packs belong in the published design
            system.
          </p>
        </section>
      </div>
    </>
  );
}
