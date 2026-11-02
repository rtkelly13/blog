/**
 * Icon-pack evaluation data.
 *
 * Every glyph below is the **real path data** from the pack's own repository,
 * not a redrawing — the whole point of the experiment is that the geometry
 * differences are the argument. Provenance and licence for each specimen are
 * declared in `PACKS` and rendered on the page (see LicenceLedger), which is
 * how the CC BY 4.0 specimens are attributed.
 *
 * Sources (fetched 2026-08-25):
 * - lucide-icons/lucide .................. ISC
 * - tabler/tabler-icons .................. MIT
 * - phosphor-icons/core .................. MIT
 * - iconoir-icons/iconoir ................ MIT
 * - halfmage/pixelarticons ............... MIT
 * - astrit/css.gg ........................ MIT
 * - google/material-design-icons ......... Apache-2.0
 * - microsoft/vscode-codicons ............ CC BY 4.0 (assets)
 * - primer/octicons ...................... MIT
 * - mono-company/mono-icons .............. MIT
 * - simple-icons/simple-icons ............ CC0-1.0
 */

/** How much the licence asks of a package that redistributes the art. */
export type LicenceTier = 'clear' | 'notice' | 'attribution' | 'bespoke';

export type Verdict = 'keep' | 'adopt' | 'accent' | 'fallback' | 'pass';

export interface IconPack {
  id: string;
  name: string;
  /** Icon count as the project's own repo states it. */
  count: string;
  licence: string;
  tier: LicenceTier;
  /** What the licence actually asks of `@rtkelly13/design-system` on npm. */
  obligation: string;
  geometry: string;
  delivery: string;
  verdict: Verdict;
  why: string;
  source: string;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  keep: 'keep',
  adopt: 'adopt',
  accent: 'accent',
  fallback: 'fallback',
  pass: 'pass',
};

/**
 * Accent per verdict. Only the three brutalist accents plus the neutral
 * zinc scale, so every chip re-themes into sketch mode with the tokens.
 */
export const VERDICT_ACCENT: Record<Verdict, string> = {
  keep: 'border-brutalist-cyan text-brutalist-cyan',
  adopt: 'border-brutalist-yellow text-brutalist-yellow',
  accent: 'border-brutalist-yellow text-brutalist-yellow',
  fallback: 'border-zinc-500 text-zinc-400',
  pass: 'border-brutalist-pink text-brutalist-pink',
};

export const PACKS: IconPack[] = [
  {
    id: 'lucide',
    name: 'Lucide',
    count: '1,600+',
    licence: 'ISC',
    tier: 'notice',
    obligation:
      'Keep the licence text with the copy you ship. Satisfied automatically while it stays an npm dependency.',
    geometry: '2px stroke on a 24 grid, round caps, ~2px corner arcs in paths',
    delivery: 'lucide-react, first-party, icon context provider',
    verdict: 'keep',
    why: 'Already installed and already correct on four of the five constraints. The one mismatch — round caps — is reachable from CSS.',
    source: 'https://github.com/lucide-icons/lucide',
  },
  {
    id: 'simple-icons',
    name: 'Simple Icons',
    count: '3,400+ brand marks',
    licence: 'CC0-1.0',
    tier: 'clear',
    obligation:
      'None. Public-domain dedication — no notice to keep, nothing propagates to consumers. Trademark is a separate question from copyright.',
    geometry: 'Brand marks, single-path fill, 24 grid',
    delivery: 'simple-icons (paths as data) + community React wrappers',
    verdict: 'adopt',
    why: 'The five social icons in this repo were already copied from here by hand. Depending on the package instead makes the provenance real and keeps the marks current.',
    source: 'https://github.com/simple-icons/simple-icons',
  },
  {
    id: 'pixelarticons',
    name: 'Pixelarticons',
    count: '816 free / 4,600 pro',
    licence: 'MIT (free tier)',
    tier: 'notice',
    obligation:
      'Keep the licence text with the copy you ship. The pro tier is a separate commercial licence — do not mix the two.',
    geometry: 'Orthogonal pixel grid, zero radius, fill on currentColor',
    delivery: 'pixelarticons, React components + raw SVG',
    verdict: 'accent',
    why: 'The only pack in the field whose grammar matches the VT323 pixel font already in the header. Scoped accent, never a site-wide replacement.',
    source: 'https://github.com/halfmage/pixelarticons',
  },
  {
    id: 'tabler',
    name: 'Tabler',
    count: '6,184 (5,130 outline + 1,054 filled)',
    licence: 'MIT',
    tier: 'notice',
    obligation: 'Keep the licence text with the copy you ship.',
    geometry: '2px stroke on a 24 grid, round caps, 6px corner radii',
    delivery: '@tabler/icons-react',
    verdict: 'fallback',
    why: 'The migration target if coverage ever blocks a post: same structure as Lucide, so the same cap fix works. Costs 6px corners.',
    source: 'https://github.com/tabler/tabler-icons',
  },
  {
    id: 'phosphor',
    name: 'Phosphor',
    count: '1,248 x 6 weights',
    licence: 'MIT',
    tier: 'notice',
    obligation: 'Keep the licence text with the copy you ship.',
    geometry: 'Fill-based, round terminals baked into the outline',
    delivery: '@phosphor-icons/react — 9,000+ modules, needs import tuning',
    verdict: 'pass',
    why: 'The six weights are genuinely useful, but a fill set with rounded terminals gives CSS nothing to square. The mismatch is permanent.',
    source: 'https://github.com/phosphor-icons/core',
  },
  {
    id: 'material',
    name: 'Material Symbols',
    count: '~3,600 x 3 styles',
    licence: 'Apache-2.0',
    tier: 'notice',
    obligation:
      'Keep the licence and any NOTICE file, and state changes you make. Heavier paperwork than MIT, and it propagates.',
    geometry: 'Sharp style is genuinely square; variable weight/fill axes',
    delivery: 'Variable font or Iconify — no first-party React package',
    verdict: 'pass',
    why: 'Sharp is a real square-geometry candidate, but the font route means a second font load and a CSP entry for icons that cost nothing today.',
    source: 'https://github.com/google/material-design-icons',
  },
  {
    id: 'iconoir',
    name: 'Iconoir',
    count: '1,600+',
    licence: 'MIT',
    tier: 'notice',
    obligation: 'Keep the licence text with the copy you ship.',
    geometry: '1.5px stroke on a 24 grid',
    delivery: 'iconoir-react',
    verdict: 'pass',
    why: 'Drawn a half-pixel lighter than every border in the system. Inside a 2px frame that reads as a different weight class, not a choice.',
    source: 'https://github.com/iconoir-icons/iconoir',
  },
  {
    id: 'heroicons',
    name: 'Heroicons',
    count: '~300',
    licence: 'MIT',
    tier: 'notice',
    obligation: 'Keep the licence text with the copy you ship.',
    geometry: 'Outline + solid at 24 / 20 / 16, soft corners',
    delivery: '@heroicons/react',
    verdict: 'pass',
    why: 'No Presentation, FlaskConical, FolderGit2 or Dice5 equivalents. A marketing-site icon set, not a blog-with-experiments one.',
    source: 'https://github.com/tailwindlabs/heroicons',
  },
  {
    id: 'cssgg',
    name: 'css.gg',
    count: '~700',
    licence: 'MIT',
    tier: 'notice',
    obligation: 'Keep the licence text with the copy you ship.',
    geometry: 'Mitred fills on currentColor, dev-tool vernacular',
    delivery: 'Raw SVG / CSS; the React wrapper is thin',
    verdict: 'pass',
    why: 'Genuinely square geometry and the right vernacular, but too small and too inconsistently covered to carry a whole site.',
    source: 'https://github.com/astrit/css.gg',
  },
  {
    id: 'octicons',
    name: 'Octicons',
    count: '~600',
    licence: 'MIT',
    tier: 'notice',
    obligation: 'Keep the licence text with the copy you ship.',
    geometry: '16 and 24 grids, fill, soft corners',
    delivery: '@primer/octicons-react',
    verdict: 'pass',
    why: "GitHub's own set, drawn for GitHub's chrome. Nothing wrong with it and nothing here it does better than the incumbent.",
    source: 'https://github.com/primer/octicons',
  },
  {
    id: 'codicons',
    name: 'Codicons',
    count: '~500',
    licence: 'CC BY 4.0 (assets)',
    tier: 'attribution',
    obligation:
      'Visible credit plus a licence link, in a form that reaches end users — and the obligation travels to everyone who installs your package.',
    geometry: '16 grid, editor vernacular, fill',
    delivery: 'Webfont-first',
    verdict: 'pass',
    why: 'The most on-theme vernacular in the field, and the licence tier that makes it the wrong thing to re-export.',
    source: 'https://github.com/microsoft/vscode-codicons',
  },
  {
    id: 'remix',
    name: 'Remix Icon',
    count: '3,000+',
    licence: 'Remix Icon License v1.0',
    tier: 'bespoke',
    obligation:
      'Attribution optional, but distribution is conditional: no standalone icon sale, no competing icon library, no use as brand identity. Read four clauses before shipping.',
    geometry: '24 grid, line + fill pairs',
    delivery: 'remixicon-react (community)',
    verdict: 'pass',
    why: 'Relicensed in January 2026 off a standard open licence. Design systems are explicitly permitted where icons are a minor component — but a bespoke licence is strictly worse than ISC for a package other people install.',
    source: 'https://github.com/Remix-Design/RemixIcon',
  },
  {
    id: 'fontawesome',
    name: 'Font Awesome Free',
    count: '2,000+',
    licence: 'CC BY 4.0 (icons)',
    tier: 'attribution',
    obligation:
      'Visible credit plus a licence link, propagating to consumers. Fonts are OFL and the code is MIT — three licences in one dependency.',
    geometry: 'Mixed weights, legacy geometry',
    delivery: '@fortawesome/react-fontawesome',
    verdict: 'pass',
    why: 'Attribution obligation on a hobby design system, for geometry that fits the brief worse than the incumbent.',
    source: 'https://github.com/FortAwesome/Font-Awesome',
  },
  {
    id: 'hackernoon',
    name: 'HackerNoon Pixel',
    count: '2,300+',
    licence: 'CC BY 4.0 (assets)',
    tier: 'attribution',
    obligation: 'Visible credit plus a licence link, propagating to consumers.',
    geometry: 'Pixel polygons on a 24 grid — the same idea as Pixelarticons',
    delivery: '@hackernoon/pixel-icon-library',
    verdict: 'pass',
    why: 'Same aesthetic win as Pixelarticons, one licence tier worse. There is no reason to take the attribution obligation when MIT buys the same look.',
    source: 'https://github.com/hackernoon/pixel-icon-library',
  },
];

/* ------------------------------------------------------------------ */
/* Glyph specimens — real path data, same symbol, drawn nine ways.     */
/* ------------------------------------------------------------------ */

export interface Glyph {
  packId: string;
  label: string;
  note: string;
  viewBox: string;
  paths: string[];
  kind: 'stroke' | 'fill';
  strokeWidth?: number;
  /**
   * Whether a CSS rule can re-cut the terminals. Stroke sets inherit
   * stroke-linecap from the root svg; fill sets have the shape baked in.
   */
  squareable: boolean;
}

/** The same arrow-up, from each pack's own repository. */
export const ARROW_SPECIMENS: Glyph[] = [
  {
    packId: 'lucide',
    label: 'Lucide',
    note: '24 grid · 2px · round',
    viewBox: '0 0 24 24',
    paths: ['m5 12 7-7 7 7', 'M12 19V5'],
    kind: 'stroke',
    strokeWidth: 2,
    squareable: true,
  },
  {
    packId: 'tabler',
    label: 'Tabler',
    note: '24 grid · 2px · round',
    viewBox: '0 0 24 24',
    paths: ['M12 5l0 14', 'M18 11l-6 -6', 'M6 11l6 -6'],
    kind: 'stroke',
    strokeWidth: 2,
    squareable: true,
  },
  {
    packId: 'iconoir',
    label: 'Iconoir',
    note: '24 grid · 1.5px · round',
    viewBox: '0 0 24 24',
    paths: ['M12 21L12 3M12 3L20.5 11.5M12 3L3.5 11.5'],
    kind: 'stroke',
    strokeWidth: 1.5,
    squareable: true,
  },
  {
    packId: 'phosphor',
    label: 'Phosphor',
    note: 'fill · regular',
    viewBox: '0 0 256 256',
    paths: [
      'M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z',
    ],
    kind: 'fill',
    squareable: false,
  },
  {
    packId: 'phosphor',
    label: 'Phosphor',
    note: 'fill · bold',
    viewBox: '0 0 256 256',
    paths: [
      'M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z',
    ],
    kind: 'fill',
    squareable: false,
  },
  {
    packId: 'pixelarticons',
    label: 'Pixelarticons',
    note: '24px grid · fill · 0 radius',
    viewBox: '0 0 24 24',
    paths: [
      'M11 20h2V4h-2zm2-12h2V6h-2zm2 2h2V8h-2zm2 2h2v-2h-2zm-6-4H9V6h2z',
      'M15 10H7V8h8zm2 2H5v-2h12z',
    ],
    kind: 'fill',
    squareable: false,
  },
  {
    packId: 'cssgg',
    label: 'css.gg',
    note: 'fill · mitred',
    viewBox: '0 0 24 24',
    paths: [
      'M17.6568 8.96219L16.2393 10.3731L12.9843 7.10285L12.9706 20.7079L10.9706 20.7059L10.9843 7.13806L7.75404 10.3532L6.34314 8.93572L12.0132 3.29211L17.6568 8.96219Z',
    ],
    kind: 'fill',
    squareable: false,
  },
  {
    packId: 'material',
    label: 'Material Sharp',
    note: 'fill · variable axes',
    viewBox: '0 -960 960 960',
    paths: [
      'M444-192v-438L243-429l-51-51 288-288 288 288-51 51-201-201v438h-72Z',
    ],
    kind: 'fill',
    squareable: false,
  },
  {
    packId: 'codicons',
    label: 'Codicons',
    note: '16 grid · fill',
    viewBox: '0 0 16 16',
    paths: [
      'M13.854 7.14576L8.85401 2.14576C8.65901 1.95076 8.34201 1.95076 8.14701 2.14576L3.14601 7.14576C2.95101 7.34076 2.95101 7.65776 3.14601 7.85276C3.34101 8.04776 3.65801 8.04776 3.85301 7.85276L7.99901 3.70676V13.4998C7.99901 13.7758 8.22301 13.9998 8.49901 13.9998C8.77501 13.9998 8.99901 13.7758 8.99901 13.4998V3.70676L13.145 7.85276C13.243 7.95076 13.371 7.99876 13.499 7.99876C13.627 7.99876 13.755 7.95076 13.853 7.85276C14.049 7.65776 14.049 7.34076 13.854 7.14576Z',
    ],
    kind: 'fill',
    squareable: false,
  },
  {
    packId: 'octicons',
    label: 'Octicons',
    note: '16 grid · fill',
    viewBox: '0 0 16 16',
    paths: [
      'M3.47 7.78a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018L9 4.81v7.44a.75.75 0 0 1-1.5 0V4.81L4.53 7.78a.75.75 0 0 1-1.06 0Z',
    ],
    kind: 'fill',
    squareable: false,
  },
];

/**
 * Lucide `file-text` — the honest caveat. Its document corners are
 * `a 2 2 0 0 1` arcs, so squaring the caps does not square the shape.
 */
export const LUCIDE_FILE_TEXT: string[] = [
  'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z',
  'M14 2v5a1 1 0 0 0 1 1h5',
  'M10 9H8',
  'M16 13H8',
  'M16 17H8',
];

/**
 * Mono Icons ships raw SVG with a baked `#0D0D0D` fill. Rendered here
 * exactly as published, to show what a non-currentColor pack does when the
 * tokens flip to paper.
 */
export const BAKED_FILL_SPECIMEN = {
  viewBox: '0 0 24 24',
  fill: '#0D0D0D',
  path: 'M12 4a1 1 0 0 1 .707.293l6 6a1 1 0 0 1-1.414 1.414L13 7.414V19a1 1 0 1 1-2 0V7.414l-4.293 4.293a1 1 0 0 1-1.414-1.414l6-6A1 1 0 0 1 12 4z',
};

/** Pixelarticons specimens, paired against their Lucide equivalents. */
export const PIXEL_SPECIMENS: { name: string; paths: string[] }[] = [
  { name: 'menu', paths: ['M20 18H4v-2h16v2Zm0-5H4v-2h16v2Zm0-5H4V6h16v2Z'] },
  {
    name: 'search',
    paths: [
      'M22 22h-2v-2h2v2Zm-2-2h-2v-2h2v2Zm-6-2H6v-2h8v2Zm4 0h-2v-2h2v2ZM6 16H4v-2h2v2Zm10 0h-2v-2h2v2ZM4 14H2V6h2v8Zm14 0h-2V6h2v8ZM6 6H4V4h2v2Zm10 0h-2V4h2v2Zm-2-2H6V2h8v2Z',
    ],
  },
  {
    name: 'external-link',
    paths: [
      'M11 5H5v2h6V5ZM5 7H3v12h2V7Zm12 12H5v2h12v-2Zm2-6h-2v6h2v-6Zm-8 0H9v2h2v-2Zm2-2h-2v2h2v-2Zm2-2h-2v2h2V9Zm2-2h-2v2h2V7Zm2-2h-2v2h2V5Zm2-2h-2v8h2V3Z',
      'M21 3h-8v2h8V3Z',
    ],
  },
  {
    name: 'chevron-right',
    paths: [
      'M16 13v-2h-2v2h2Zm-2-2V9h-2v2h2Zm0 4v-2h-2v2h2Zm-2-6V7h-2v2h2Zm0 8v-2h-2v2h2ZM10 7V5H8v2h2Zm0 12v-2H8v2h2Z',
    ],
  },
  {
    name: 'file',
    paths: [
      'M6 4H4v16h2zm10-2H6v2h10zm4 4h-2v14h2zm-2 14H6v2h12zM16 4h2v2h-2zm-4 0h2v6h-2z',
      'M12 8h6v2h-6z',
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Brand-mark provenance — what components/social-icons actually ships. */
/* ------------------------------------------------------------------ */

export interface BrandMark {
  kind: string;
  /** Where the vendored path actually came from. */
  provenance: string;
  licence: string;
  /** Whether the repo currently declares that provenance anywhere. */
  declared: boolean;
  viewBox: string;
  path: string;
}

export const BRAND_MARKS: BrandMark[] = [
  {
    kind: 'github',
    provenance: 'Simple Icons — path matches upstream byte for byte',
    licence: 'CC0-1.0',
    declared: true,
    viewBox: '0 0 24 24',
    path: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  },
  {
    kind: 'linkedin',
    provenance: 'Simple Icons, hand-copied',
    licence: 'CC0-1.0',
    declared: true,
    viewBox: '0 0 24 24',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    kind: 'x',
    provenance: 'Simple Icons, hand-copied',
    licence: 'CC0-1.0',
    declared: true,
    viewBox: '0 0 24 24',
    path: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  },
  {
    kind: 'twitter',
    provenance: 'Simple Icons — the retired pre-2023 bird, still shipping',
    licence: 'CC0-1.0',
    declared: true,
    viewBox: '0 0 24 24',
    path: 'M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z',
  },
  {
    kind: 'mail',
    provenance: 'Not a brand mark and not Simple Icons — a stray 20x20 glyph',
    licence: 'unknown',
    declared: false,
    viewBox: '0 0 20 20',
    path: 'M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884zM18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z',
  },
];
