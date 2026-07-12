# Template Divergence: Two-Way Diff vs tailwind-nextjs-starter-blog

This blog is based on [timlrx/tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog).
It forked from the **v1.x** lineage and has diverged significantly in both directions since.
This document is a two-way idea diff:

1. **[Unique to this blog](#1-unique-to-this-blog-back-port-candidates)** — ideas that don't exist upstream and could be back-ported to the template (or extracted as standalone packages / pliny-style addons).
2. **[Upstream ideas worth bringing in](#2-upstream-ideas-worth-bringing-in)** — features the template has gained (mostly in v2.x) that this blog lacks.
3. **[Convergent evolution](#3-convergent-evolution-both-have-it-implemented-differently)** — features both sides have, implemented differently.

**Comparison baseline:** upstream `main` at `b45bef6` (v2.4.0, 2026-02-08), compared 2026-07-12.
See [Keeping this document current](#keeping-this-document-current) for how to refresh it.

## Architecture at a glance

| Axis | This blog | Upstream v2.4.0 |
| --- | --- | --- |
| Router | Pages Router (`pages/`) | App Router (`app/`, RSC) |
| Content pipeline | `mdx-bundler` + `gray-matter` at request/build time (`lib/mdx.ts`) | `contentlayer2` build-time content layer with typed computed fields |
| Framework | Next.js 16, React 19 | Next.js 15, React 19 |
| Styling | Tailwind v4, brutalist design system, forced dark theme | Tailwind v4, neutral theme with primary-color knob, light/dark |
| Third-party services | Convex realtime backend, Giscus, Vercel | pliny abstraction (analytics/comments/newsletter/search providers) |
| Lint/format | Biome | ESLint 9 + Prettier |
| Tests | Vitest + Playwright (e2e, visual, regression-vs-deployed) | None |

The fork point matters: this blog inherited the v1 architecture and evolved it independently,
while upstream rewrote itself for v2. Several "missing" upstream features are really
"the v2 rewrite happened after we forked".

## 1. Unique to this blog (back-port candidates)

Ordered roughly by how cleanly each would back-port to the template.

### Strong back-port candidates

- **Post series** — first-class multi-part posts via `series: { name, order }` frontmatter,
  with `layouts/SeriesLayout.tsx`, `components/SeriesNavigation.tsx`, `lib/series.ts`, and
  `/series` index pages. Upstream only offers nested routing for multi-part posts; a declarative
  series field is strictly more ergonomic and has no blog-specific coupling.
- **Test suite as a template feature** — upstream ships zero tests. The general-purpose parts of
  `tests/` back-port directly: frontmatter validation (`frontmatter.spec.ts`), tag validation,
  feed correctness (`feeds.spec.ts`), reading-time sanity, responsive/visual snapshots. A starter
  template arguably benefits from these more than a personal blog does, since users break these
  invariants while customising.
- **Regression-vs-deployed-main visual suite** (`playwright.regression.config.ts`,
  `tests/visual-vs-deployed.spec.ts`) — screenshots the local build against the live production
  deployment to verify dependency upgrades cause no visual drift. Template users upgrading
  Next/Tailwind majors would get a lot of value from this pattern.
- **Content authoring CLI** — `scripts/create-post.mjs` (scaffold a post) and `scripts/compose.mjs`
  (interactive wizard). Zero coupling to this blog's design; the template currently makes users
  hand-copy frontmatter from sample posts.
- **Operational check scripts** — `scripts/audit-seo.mjs` (SEO audit) and
  `scripts/verify-deployment.mjs` (post-deploy verification). Generic and provider-agnostic.
- **Storybook design system** (`stories/`, `.storybook/`) — component/typography stories as living
  documentation. The pattern (not the brutalist content) back-ports well to a template whose main
  selling point is customisable styling.
- **Hierarchical agent docs** — root `AGENTS.md` knowledge base with per-directory
  `components/AGENTS.md`, `lib/AGENTS.md`, `tests/AGENTS.md`, plus `docs/adr/` decision records.
  As templates increasingly get customised by AI agents, shipping this structure upstream is a
  differentiator.

### Back-portable as opt-in extras

- **Diagram components** (`components/diagrams/`) — Mermaid, React Flow, and raw-SVG diagram
  wrappers behind one `Diagram` interface. Would fit upstream as an optional MDX component
  (the template already documents custom MDX components in `faq/`).
- **Seed-driven generative graphics** (`components/graphics/`) — deterministic RNG + palette +
  generator registry producing SVG backgrounds and talk/OG art. Fun, self-contained, and
  frontmatter-driven; a natural "hero image without an image" feature for a starter.
- **OG image / favicon generation** (`scripts/generate-og-image.mjs`,
  `scripts/generate-favicon.mjs`) — build-time asset generation instead of committed binaries.
- **Image ergonomics** — `ExpandableImage` (click-to-zoom), `DarkImage` (theme-aware swap),
  `AlignImage`; plus `NoteBlock` callouts.

### Unique but too opinionated to back-port wholesale

- **Talks platform** — MDX-authored Spectacle slide decks (`data/talks/`, `pages/talks/`,
  `components/talks/`), presenter view, slide timing, break timers, archived decks, and inline
  YouTube recording embeds. The *idea* — one MDX pipeline feeding both posts and slide decks —
  could be a compelling pliny-style addon, but the implementation is deeply tied to this site.
- **Convex realtime layer** (`convex/`) — live audience presence, Q&A queues, polls, emoji
  reactions with rate limiting and profanity filtering (`obscenity`), admin dashboard
  (`pages/admin.tsx`, `components/admin/`), machine-id anonymous identity. Post reactions
  (`components/Reactions.tsx`) are the most template-shaped slice, but they drag a backend with
  them; upstream deliberately stays backend-free.
- **Live e2e harness** (`tests/live-e2e.mjs`, `docs/live-e2e-harness.md`) — multi-client
  Playwright orchestration for the realtime features. Only meaningful with the Convex layer.
- **Secrets provisioning** (`secrets/`, `scripts/provision.mjs`) and Docker dev environment —
  useful pattern, but shaped by this repo's service set.

## 2. Upstream ideas worth bringing in

Ordered by value-to-effort for this blog.

- **Preconfigured security headers** — upstream's `next.config.js` ships a CSP,
  `Referrer-Policy`, `X-Frame-Options`, and friends. **This blog currently sets no security
  headers at all** — this is the clearest immediate win and is a copy-paste-and-tune job
  (script-src needs Convex, Giscus, and YouTube entries).
- **Contentlayer-style typed content layer** — upstream's `contentlayer.config.ts` gives
  build-time validated, type-safe documents with computed fields (slug, TOC, reading time,
  structured data) and generates `tag-data.json` once at build. This blog re-derives the same
  things per-page through `lib/mdx.ts` + ad-hoc scripts (`generate-search.mjs`,
  `generate-tag-rss.mjs`). Even without adopting contentlayer2 itself (its Next 16 support needs
  checking; `content-collections` is the actively-maintained equivalent), consolidating on a
  single build-time content pass would delete a lot of bespoke glue.
- **App Router migration** — upstream moved to `app/` with RSC, native `sitemap.ts`/`robots.ts`
  metadata routes, and smaller client bundles. Big-ticket, and Pages Router remains supported,
  but every future upstream idea lands in App Router shape, so the longer this waits the less
  transplantable upstream code becomes. Worth treating as its own ADR.
- **Citation / bibliography support** — `rehype-citation` + `references-data.bib` gives proper
  academic-style citations in MDX. Cheap to add to the remark/rehype stack and a good fit for
  long-form technical posts.
- **`ListLayoutWithTags`** — the v2 listing layout with a tag-count sidebar. This blog only has
  the v1 `ListLayout`; the sidebar variant is a nicer browse experience and slots into the
  existing layout system.
- **Projects page** — data-driven portfolio page (`projectsData.ts` + `Card`). This blog has no
  equivalent surface for non-post work (the talks index covers only talks).
- **pliny provider abstractions** — upstream delegates analytics (Umami/Plausible/Posthog/GA…),
  newsletter (7+ providers), and comments to pliny config. This blog carries hand-maintained v1
  copies (`components/analytics/`, `components/comments/`, `pages/api/newsletter.ts`). Worth it
  mainly if switching providers; otherwise the inlined versions are fine and more hackable.
- **Small rehype niceties** — `rehype-katex-notranslate` (stops browser translation mangling
  math) and `rehype-preset-minify`.
- **Font loading via `next/font`** — upstream self-hosts through `next/font`'s optimizer; this
  blog uses `@fontsource/*` packages. Minor performance/FOUT win, low priority given five fonts
  are already bundled locally.

## 3. Convergent evolution (both have it, implemented differently)

Reassurance list — no action needed, but useful when reading upstream code:

- **JSON-LD structured data** — upstream computes it as a contentlayer field; this blog builds it
  in `components/SEO.tsx`.
- **Per-tag RSS feeds** — upstream in `scripts/rss.mjs` (postbuild), this blog in
  `scripts/generate-tag-rss.mjs`.
- **Kbar command-palette search** — upstream via pliny with a build-time index from contentlayer;
  this blog via `components/search/` + `scripts/generate-search.mjs`.
- **GitHub-style blockquote alerts, KaTeX math, prism+ highlighting, reading time, TOC,
  draft posts, Giscus comments, sitemap generation** — both sides, near-identical plumbing.
- **Author data** — both keep `data/authors/`; upstream additionally supports multiple authors
  per post via `authors:` frontmatter, which a single-author blog doesn't need.

## Keeping this document current

- Upstream moves: diff against the pinned baseline with
  `git clone --depth 1 https://github.com/timlrx/tailwind-nextjs-starter-blog` and compare
  `README.md`'s feature list, `contentlayer.config.ts`, and `components/` against the sections
  above; then update the baseline commit at the top.
- When an item in section 2 is adopted (or rejected), move it to section 3 or delete it and note
  the decision — ideally as an ADR in `docs/adr/`.
