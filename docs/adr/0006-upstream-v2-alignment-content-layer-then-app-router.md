# Upstream v2 alignment lands in two phases: typed content layer first, App Router second

**Status: Proposed** — planning ADR; neither phase is scheduled yet. See
`docs/template-divergence.md` for the full two-way diff against upstream.

## Context

This blog forked from tailwind-nextjs-starter-blog **v1.x** (Pages Router,
`mdx-bundler` at request/build time, hand-rolled glue scripts). Upstream
rewrote itself for v2: App Router + RSC, `contentlayer2` as a typed
build-time content layer, native `sitemap.ts`/`robots.ts` metadata routes.

Staying on the v1 architecture has real, compounding costs:

- **Upstream code stops being transplantable.** Every new upstream feature
  lands in App Router + contentlayer shape; each one we want costs a manual
  re-derivation (see the `ListLayoutWithTags` and citations ports).
- **The content pipeline is re-derived per page.** `getAllFilesFrontMatter`
  re-reads and re-parses every MDX file for each listing page's
  `getStaticProps`, and `scripts/generate-{search,sitemap,tag-rss}.mjs` each
  do their own pass. Frontmatter is only validated by tests
  (`frontmatter.spec.ts`), not by types at build time.
- **`mdx-bundler` evaluates compiled MDX with `new Function` at render
  time**, which forces `'unsafe-eval'` into the CSP — the single biggest
  weakness in the security-headers setup.
- **Client bundles carry the whole page tree.** RSC would keep MDX
  compilation and content data on the server.

A big-bang rewrite is off the table: the talks platform (slide-split MDX,
Spectacle, Convex live surfaces) has no upstream equivalent and must keep
working throughout.

## Decision

Align with upstream v2 in two independently shippable phases, in this order:

### Phase 1 — typed content layer for posts

Adopt **content-collections** (the actively maintained successor pattern;
upstream's `contentlayer2` also works but its support for our Next major
should be re-checked at implementation time) for `data/blog`, `data/authors`,
and `data/series`:

- One build-time pass produces typed, validated documents with computed
  fields (slug, TOC, reading time, structured data) — replacing
  `getAllFilesFrontMatter`, the per-page re-parsing, and the frontmatter
  validation tests' role as the only schema check.
- `tag-data`, the kbar search index, sitemap, and RSS (site + per-tag) become
  derivations of that single pass instead of four separate scripts.
- **Talks stay on the bespoke pipeline** (`lib/talks.ts` slide-splitting is
  not expressible in a generic content layer) but keep reusing the shared
  remark/rehype stack from `lib/mdx.ts`.

### Phase 2 — incremental App Router migration

Use Next's pages/app coexistence to migrate route-by-route, safest first:

1. Static leaves: `/about`, `/projects`, `/tags` — prove out Metadata API +
   `app/sitemap.ts`/`robots.ts`, delete `scripts/generate-sitemap.mjs` and
   most of `components/SEO.tsx`.
2. `/blog` + `/series` listings and post pages — MDX rendering moves into
   RSC; component injection via an explicit `MDXComponents` mapping (the
   `cwd: components` auto-import trick in `bundleMDX` does not carry over).
   This is the step that can drop `'unsafe-eval'` from the CSP.
3. Last, the interactive surfaces: `/talks`, `/live`, `/admin` — heavy
   client components (Spectacle, Convex hooks) that work as `'use client'`
   islands but gain the least and risk the most.

Each step must pass the **regression-vs-deployed-main visual suite**
(`pnpm test:regression`) before merging — that suite exists precisely to
de-risk this kind of migration.

### Explicitly not adopted

- **pliny** (upstream's analytics/newsletter/comments/search abstraction):
  the inlined v1 components are small, working, and more hackable. Revisit
  only if we actually switch providers.

## Consequences

- Phase 1 alone deletes most bespoke glue and gives build-time frontmatter
  type safety; it does not touch routing and is low-risk.
- Phase 2 unlocks RSC, native metadata routes, smaller client bundles, a
  CSP without `'unsafe-eval'`, and transplantable upstream code — at the
  cost of touching every route and a large visual-snapshot churn.
- Until Phase 2 completes, the site runs both routers; `_app.tsx`-level
  concerns (fonts, theme, Convex provider) exist in both trees and must be
  kept in sync.
- Triggering condition: schedule Phase 1 opportunistically (e.g. alongside
  the next Next.js major upgrade, when `test:regression` runs anyway);
  Phase 2 only after Phase 1 has soaked in production.
