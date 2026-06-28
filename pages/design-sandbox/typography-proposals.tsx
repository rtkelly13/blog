import Head from 'next/head';
import { useState } from 'react';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * TYPOGRAPHY PROPOSALS
 * --------------------
 * An evaluation surface for fixing two concrete problems with the current
 * (hacker-theme) type system:
 *
 *   1. Share Tech Mono ships a SINGLE weight (400). Every `font-bold`
 *      heading on the site is therefore *synthetic* (faux) bold — the
 *      smeared, low-contrast heaviness you see on headings.
 *   2. `sans` and `mono` both resolve to Share Tech Mono, so there is no
 *      typeface pairing and no display/body contrast anywhere.
 *
 * Each proposal below pairs a display face with a body/code face and uses
 * a typeface that has a REAL weight axis, so the hierarchy is genuine.
 * Fonts are loaded from Google Fonts on this page only (no global change)
 * so you can compare before committing anything to the design tokens.
 */

type Role = {
  fontFamily: string;
  fontWeight: number;
  letterSpacing?: string;
  textTransform?: 'uppercase' | 'none';
};

type System = {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  accent: string; // tailwind text color class for the accent
  // role -> css
  display: Role;
  heading: Role;
  subheading: Role;
  body: Role;
  code: Role;
  meta: Role;
  weightLadder: { family: string; weights: number[] };
  pros: string[];
  cons: string[];
  tokens: string; // tailwind.config fontFamily snippet
  install: string;
};

const JETBRAINS = '"JetBrains Mono", "Courier New", monospace';
const SPACE_GROTESK = '"Space Grotesk", system-ui, sans-serif';
const INTER = 'Inter, system-ui, sans-serif';
const PLEX_MONO = '"IBM Plex Mono", "Courier New", monospace';
const SHARE_TECH = '"Share Tech Mono", "Courier New", monospace';

const CURRENT: System = {
  id: 'current',
  name: 'CURRENT — Share Tech Mono',
  tagline: 'What ships today on the hacker-theme branch',
  badge: 'LIVE',
  accent: 'text-zinc-400',
  display: {
    fontFamily: SHARE_TECH,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: SHARE_TECH,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  subheading: {
    fontFamily: SHARE_TECH,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  body: { fontFamily: SHARE_TECH, fontWeight: 400 },
  code: { fontFamily: SHARE_TECH, fontWeight: 400 },
  meta: { fontFamily: SHARE_TECH, fontWeight: 400, textTransform: 'uppercase' },
  weightLadder: { family: SHARE_TECH, weights: [400, 700] },
  pros: ['Strong terminal identity', 'Already wired up'],
  cons: [
    'Only one real weight (400) — every bold heading is FAUX bold',
    'sans === mono: zero typeface pairing or contrast',
    'No mid-weights for UI / emphasis hierarchy',
  ],
  tokens: `// today
sans: ['"Share Tech Mono"', ...],
mono: ['"Share Tech Mono"', 'Courier New', ...],`,
  install: 'already installed (@fontsource/share-tech-mono)',
};

const PROPOSALS: System[] = [
  {
    id: 'a',
    name: 'A · Refined Terminal',
    tagline: 'Stay all-mono, but on a face with a real weight axis',
    badge: 'LOWEST RISK',
    accent: 'text-brutalist-cyan',
    display: {
      fontFamily: JETBRAINS,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      textTransform: 'uppercase',
    },
    heading: {
      fontFamily: JETBRAINS,
      fontWeight: 700,
      textTransform: 'uppercase',
    },
    subheading: {
      fontFamily: JETBRAINS,
      fontWeight: 600,
      textTransform: 'uppercase',
    },
    body: { fontFamily: JETBRAINS, fontWeight: 400 },
    code: { fontFamily: JETBRAINS, fontWeight: 500 },
    meta: {
      fontFamily: JETBRAINS,
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    weightLadder: { family: JETBRAINS, weights: [400, 500, 700, 800] },
    pros: [
      'Keeps the terminal/brutalist identity intact',
      'JetBrains Mono ships 100–800 — bold is REAL, not synthetic',
      'Drop-in: only the font tokens change, every existing class still works',
      '800 display weight gives headings genuine punch',
    ],
    cons: [
      'Still a single-voice system — limited display/body contrast',
      'Long-form body text remains monospace (lower reading density)',
    ],
    tokens: `sans: ['"JetBrains Mono"', ...defaultTheme.fontFamily.mono],
mono: ['"JetBrains Mono"', 'Courier New', ...defaultTheme.fontFamily.mono],
// display weight 800 available via font-extrabold`,
    install: 'pnpm add @fontsource/jetbrains-mono',
  },
  {
    id: 'b',
    name: 'B · Grotesk × Mono',
    tagline: 'Geometric display face paired with a mono body — true contrast',
    badge: 'RECOMMENDED',
    accent: 'text-brutalist-pink',
    display: {
      fontFamily: SPACE_GROTESK,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      textTransform: 'uppercase',
    },
    heading: {
      fontFamily: SPACE_GROTESK,
      fontWeight: 700,
      textTransform: 'uppercase',
    },
    subheading: {
      fontFamily: SPACE_GROTESK,
      fontWeight: 600,
      textTransform: 'uppercase',
    },
    body: { fontFamily: JETBRAINS, fontWeight: 400 },
    code: { fontFamily: JETBRAINS, fontWeight: 500 },
    meta: {
      fontFamily: JETBRAINS,
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    weightLadder: { family: SPACE_GROTESK, weights: [400, 500, 600, 700] },
    pros: [
      'Real pairing: heavy geometric headlines vs. mono body texture',
      'Both faces have full weight axes — genuine hierarchy',
      'Space Grotesk reads as "techy" — keeps cyberpunk spirit',
      'Mono stays where it earns its keep: body, code, metadata',
    ],
    cons: [
      'Two font families to load & maintain',
      'Headings lose the pure-terminal look (a feature for some, not all)',
    ],
    tokens: `sans: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans], // display/headings
mono: ['"JetBrains Mono"', 'Courier New', ...defaultTheme.fontFamily.mono], // body/code
// headings switch from font-mono -> font-sans`,
    install: 'pnpm add @fontsource/space-grotesk @fontsource/jetbrains-mono',
  },
  {
    id: 'c',
    name: 'C · Editorial Three-Role',
    tagline: 'Display + readable sans body + mono for code only',
    badge: 'MOST READABLE',
    accent: 'text-brutalist-yellow',
    display: {
      fontFamily: SPACE_GROTESK,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      textTransform: 'uppercase',
    },
    heading: {
      fontFamily: SPACE_GROTESK,
      fontWeight: 700,
      textTransform: 'uppercase',
    },
    subheading: {
      fontFamily: SPACE_GROTESK,
      fontWeight: 600,
      textTransform: 'none',
    },
    body: { fontFamily: INTER, fontWeight: 400 },
    code: { fontFamily: PLEX_MONO, fontWeight: 500 },
    meta: {
      fontFamily: PLEX_MONO,
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    },
    weightLadder: { family: INTER, weights: [400, 500, 600, 700, 800] },
    pros: [
      'Best long-form reading by far (Inter body)',
      'Three clear roles: display / reading / code',
      'Full weight scale for nuanced UI hierarchy (400→800)',
      'Mono confined to code & terminal accents — used intentionally',
    ],
    cons: [
      'Furthest from the current all-mono aesthetic',
      'Three families to load; biggest visual departure',
      'Risks softening the brutalist edge if borders/colors not kept loud',
    ],
    tokens: `sans: ['"Space Grotesk"', ...],  // headings/display
serif: ['Inter', ...],          // (used for body via prose)
mono: ['"IBM Plex Mono"', ...], // code + metadata only`,
    install:
      'pnpm add @fontsource/space-grotesk @fontsource/inter @fontsource/ibm-plex-mono',
  },
];

const Specimen = ({ s }: { s: System }) => (
  <div className="bg-black border-2 border-white p-6 space-y-6">
    {/* meta / eyebrow */}
    <p className="text-xs text-brutalist-cyan" style={s.meta}>
      [ 2026-06-28 ] · 7 MIN READ · #typography #design-systems
    </p>

    {/* display */}
    <h1
      className="text-4xl md:text-5xl text-white leading-none"
      style={s.display}
    >
      Rebuilding the type system
    </h1>

    {/* heading */}
    <h2 className="text-2xl text-white" style={s.heading}>
      {'>'} Why weight matters
    </h2>

    {/* body */}
    <p className="text-base text-zinc-200 leading-relaxed" style={s.body}>
      A typeface with a real weight axis lets headings carry genuine emphasis
      instead of the browser faking it. The quick brown fox jumps over the lazy
      dog — 0123456789 — and the difference between{' '}
      <code
        className="text-brutalist-neonGreen border border-white px-1"
        style={s.code}
      >
        font-bold
      </code>{' '}
      that is drawn vs. synthesised is immediately visible at this size.
    </p>

    {/* subheading */}
    <h3 className="text-lg text-white" style={s.subheading}>
      {'// secondary heading'}
    </h3>

    <p className="text-sm text-zinc-400 leading-relaxed" style={s.body}>
      Secondary copy sits a step down in weight and colour. Good systems give
      you at least three usable steps so hierarchy never depends on size alone.
    </p>

    {/* code block */}
    <pre
      className="bg-zinc-900 border-2 border-white p-4 text-sm text-brutalist-neonGreen overflow-x-auto"
      style={s.code}
    >{`function greet(name: string) {
  console.log(\`> hello, \${name}\`);
}`}</pre>

    {/* link + tags */}
    <div className="flex flex-wrap items-center gap-3">
      <span
        className="bg-brutalist-cyan text-black text-xs font-bold px-3 py-1 border-2 border-white uppercase"
        style={s.meta}
      >
        FEATURED
      </span>
      <span
        className="bg-brutalist-pink text-black text-xs font-bold px-3 py-1 border-2 border-white uppercase"
        style={s.meta}
      >
        NEW
      </span>
      <span className="text-brutalist-cyan underline" style={s.body}>
        {'>'} read more →
      </span>
    </div>

    {/* weight ladder */}
    <div className="pt-2 border-t-2 border-white/20">
      <p className="text-xs text-zinc-500 mb-2" style={s.meta}>
        WEIGHT LADDER (real cuts)
      </p>
      <div className="space-y-1">
        {s.weightLadder.weights.map((w) => (
          <div
            key={w}
            className="text-xl text-white flex items-baseline gap-3"
            style={{ fontFamily: s.weightLadder.family, fontWeight: w }}
          >
            <span className="text-xs text-zinc-500 w-10 shrink-0">{w}</span>
            <span>Sphinx of black quartz, judge my vow</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function TypographyProposals() {
  const [selected, setSelected] = useState<System>(PROPOSALS[1]); // default: B
  const [compare, setCompare] = useState(true);

  return (
    <>
      <PageSEO
        title={`Typography Proposals - Design Sandbox - ${siteMetadata.author}`}
        description="Evaluate font-pairing and weight-system proposals for the blog"
      />
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="divide-y divide-white">
        {/* header */}
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <p className="font-mono text-sm text-zinc-500">
            <Link href="/design-sandbox" className="hover:text-brutalist-cyan">
              {'<'} design_sandbox
            </Link>
          </p>
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 font-mono uppercase border-2 border-white inline-block px-4 py-2">
            [ TYPOGRAPHY_PROPOSALS ]
          </h1>
          <p className="text-lg leading-7 text-zinc-400 font-mono">
            {'>'} Pick a direction for font pairing + weight. Rendered live, no
            tokens changed yet.
          </p>
        </div>

        {/* diagnosis */}
        <div className="container py-8">
          <div className="border-2 border-brutalist-pink bg-zinc-900 p-6">
            <h2 className="font-mono font-bold text-xl text-brutalist-pink mb-4 uppercase">
              [ DIAGNOSIS ]
            </h2>
            <ul className="space-y-2 font-mono text-sm text-zinc-200">
              <li>
                <span className="text-brutalist-pink mr-2">!</span>
                <strong className="text-white">
                  Share Tech Mono has one weight (400).
                </strong>{' '}
                Every{' '}
                <code className="text-brutalist-neonGreen">font-bold</code>{' '}
                heading is browser-synthesised faux bold — smeared and
                low-contrast.
              </li>
              <li>
                <span className="text-brutalist-pink mr-2">!</span>
                <strong className="text-white">No pairing.</strong> `sans` and
                `mono` both map to Share Tech Mono, so display and body text
                have zero contrast.
              </li>
              <li>
                <span className="text-brutalist-pink mr-2">!</span>
                <strong className="text-white">No mid-weights.</strong>{' '}
                Hierarchy relies on size + colour alone; there is no 500/600
                step for UI.
              </li>
            </ul>
          </div>
        </div>

        {/* controls */}
        <div className="container py-8 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {PROPOSALS.map((p) => {
              const active = selected.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p)}
                  className={`font-mono text-sm font-bold px-4 py-2 border-2 uppercase transition-colors ${
                    active
                      ? 'bg-white text-black border-white'
                      : 'bg-black text-white border-white hover:border-brutalist-cyan hover:text-brutalist-cyan'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
            <label className="ml-auto flex items-center gap-2 font-mono text-xs text-zinc-400 uppercase cursor-pointer select-none">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => setCompare(e.target.checked)}
                className="accent-brutalist-cyan"
              />
              Compare vs. current
            </label>
          </div>

          {/* proposal summary */}
          <div className="border-2 border-white bg-zinc-900 p-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h3
                className={`font-mono font-bold text-2xl uppercase ${selected.accent}`}
              >
                {selected.name}
              </h3>
              <span
                className={`font-mono text-xs font-bold px-2 py-1 border-2 uppercase ${selected.accent} border-current`}
              >
                {selected.badge}
              </span>
            </div>
            <p className="font-mono text-sm text-zinc-400 mb-4">
              {selected.tagline}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-xs text-brutalist-cyan uppercase mb-1">
                  + Strengths
                </p>
                <ul className="space-y-1 font-mono text-xs text-zinc-300">
                  {selected.pros.map((x) => (
                    <li key={x}>
                      <span className="text-brutalist-cyan mr-1">{'>'}</span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-xs text-brutalist-pink uppercase mb-1">
                  - Trade-offs
                </p>
                <ul className="space-y-1 font-mono text-xs text-zinc-300">
                  {selected.cons.map((x) => (
                    <li key={x}>
                      <span className="text-brutalist-pink mr-1">!</span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* specimens */}
          <div className={`grid gap-6 ${compare ? 'lg:grid-cols-2' : ''}`}>
            {compare && (
              <div className="space-y-2">
                <p className="font-mono text-xs text-zinc-500 uppercase">
                  ▾ current (share tech mono)
                </p>
                <Specimen s={CURRENT} />
              </div>
            )}
            <div className="space-y-2">
              <p className={`font-mono text-xs uppercase ${selected.accent}`}>
                ▾ {selected.name}
              </p>
              <Specimen s={selected} />
            </div>
          </div>

          {/* adoption */}
          <div className="border-2 border-brutalist-cyan bg-zinc-900 p-6 space-y-4">
            <h3 className="font-mono font-bold text-xl text-brutalist-cyan uppercase">
              [ HOW_TO_ADOPT — {selected.name} ]
            </h3>
            <div>
              <p className="font-mono text-xs text-zinc-500 uppercase mb-1">
                1. install
              </p>
              <pre className="bg-black border-2 border-white p-3 text-xs font-mono text-brutalist-neonGreen overflow-x-auto">
                {selected.install}
              </pre>
            </div>
            <div>
              <p className="font-mono text-xs text-zinc-500 uppercase mb-1">
                2. tailwind.config.js → fontFamily
              </p>
              <pre className="bg-black border-2 border-white p-3 text-xs font-mono text-brutalist-cyan overflow-x-auto">
                {selected.tokens}
              </pre>
            </div>
            <p className="font-mono text-xs text-zinc-400">
              {'>'} Then import the @fontsource packages in{' '}
              <code className="text-brutalist-neonGreen">pages/_app.tsx</code>{' '}
              (same place Share Tech Mono / VT323 are imported today).
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
