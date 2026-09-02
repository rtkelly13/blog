# Technical guide

Stack, commands, build pipeline, and CI for the blog. Content-authoring and
talks have their own guides — see [posting.md](./posting.md) and
[talks.md](./talks.md).

## Stack

Next.js 16 (**Pages Router**, not App Router) + React 19, Tailwind CSS v4, MDX
content via `mdx-bundler`, Convex realtime backend for the live-talk platform.
Package manager is **pnpm** (`node >=22`, `pnpm >=9`).

### Pages Router conventions

- `pages/` with `_app.tsx` / `_document.tsx`; dynamic routes `[...slug].tsx`,
  `[tag].tsx`, `[page].tsx`; API routes under `pages/api/`.
- Pages compose a layout from `layouts/` via the `MDXLayoutRenderer` wrapper.
- MDX pipeline (bundleMDX, custom remark/rehype plugins) lives in `lib/` — see
  **[lib/AGENTS.md](../lib/AGENTS.md)**.

## Commands

```bash
# Development
pnpm dev                   # dev server (Turbopack)
pnpm storybook             # design system at :6006

# Build
pnpm build                 # next build + feeds + sitemap + search + OG images

# Testing
pnpm test                  # Vitest unit tests
pnpm test:coverage         # + coverage (./coverage)
pnpm test:e2e              # Playwright
pnpm test:regression       # diff local build vs deployed main (see tests/AGENTS.md)
pnpm test:snapshots:remote # regenerate visual snapshots on the CI runner (see below)

# Quality
pnpm lint                  # Biome check
pnpm typecheck             # tsc --noEmit
pnpm format                # Biome format
```

## Build pipeline

```
pnpm build
├── next build (Turbopack)
├── scripts/generate-rss.mjs         # public/feed.xml
├── scripts/generate-tag-rss.mjs     # public/tags/<tag>/feed.xml
├── scripts/generate-sitemap.mjs     # must follow generate-tag-rss: it reads the
│                                    # generated tag feeds to derive /tags/<tag>
├── scripts/generate-search.mjs
├── scripts/build-search-index.mjs
└── scripts/generate-og-images.mjs   # deterministic per-post OG cards
```

Order matters, and the feeds are build steps on purpose — `feed.xml` and the tag
feeds used to be written as `fs.writeFileSync` side effects inside
`getStaticProps`, so they existed only if a post or tag page happened to be
built.

## Indexing policy

`lib/seo/routePolicy.mjs` is the single list of routes kept out of search
results (admin and presenter surfaces, the design sandbox, experiment
prototypes, the ideas workbench). Two consumers read it, and both must agree:

- `components/SEO.tsx` emits the page's one `robots` meta from it. Content that
  is unpublished rather than route-excluded — a `draft: true` post or talk —
  passes `noindex` explicitly, since a draft shares its route with published
  content.
- `scripts/generate-sitemap.mjs` filters against it, so a noindexed page is
  never advertised in `sitemap.xml`.

A page that renders no SEO component gets no title, description or `robots`
tag; `pnpm check:seo` fails on that, and on site-level regressions such as a
placeholder `siteMetadata.description` or a `siteUrl` with a trailing slash.
`public/robots.txt` blocks the auth-gated surfaces outright and points at the
sitemap.

Requires building the external `@rtkelly/mermaid-toolkit` first in CI (handled
by the `.github/actions/setup-blog` composite action).

## CI/CD

Consolidated PR gate — every check runs as its own parallel job, all feeding one
required status check (`PR checks`).

```
PR → .github/workflows/pr-checks.yml
      ├── lint / typecheck / unit / build / e2e-visual   (all blocking)
      └──► conclusion = "PR checks"  (job summary + sticky comment + coverage delta)

push main → ci.yml                # full suite + uploads coverage-main baseline
workflow_dispatch → playwright.yml  # manual: regenerate Linux snapshots
PR comment /update-snapshots        # regenerate AND commit snapshots to the branch
```

- **Visual regression is blocking.** Intentional visual changes must ship
  regenerated snapshots *in the same PR*. Snapshots must be generated on the CI
  runner (Linux) so they match what `e2e-visual` compares against — regenerate
  with `pnpm test:snapshots:remote` (triggers `playwright.yml` on your branch,
  downloads and commits the PNGs) or comment `/update-snapshots` on the PR.
  **Never** commit macOS-rendered snapshots.

### Branch workflow

`main` enforces **linear history** (merge commits disabled). Reconcile a branch
by **rebasing onto `main`** (`git rebase origin/main`, force-push with
`--force-with-lease`), never a merge commit. PRs land via **squash merge** only.

## Browser control (agent-browser)

The GitHub-gated presenter surfaces (`/admin`, deck `?mode=presenter|console`)
and anything behind Convex Auth need a **real, GitHub-logged-in session**.

**Preferred — a dedicated dev profile** (`~/.agent-browser-profiles/dev`):
agent-browser drives its own Chrome for Testing against a persistent profile you
sign into once, isolated from your daily Chrome.

```bash
# One-time: sign in (headed window → "Sign in with GitHub")
agent-browser --profile ~/.agent-browser-profiles/dev --headed open http://localhost:3002/admin
# Thereafter the GitHub/Convex session persists:
agent-browser --profile ~/.agent-browser-profiles/dev open <url>
```

Set `AGENT_BROWSER_PROFILE=~/.agent-browser-profiles/dev` to make it the default.

> **Known issue:** agent-browser's bundled Chrome for Testing has hydration
> problems on some versions (pages load but React never commits). Fallback:
> launch Playwright's Chromium on the same profile with
> `--remote-debugging-port=9223` and `agent-browser connect 9223`. The dev
> Convex deployment expects the app on **port 3002** (OAuth callback URL).

Avoid `--auto-connect` to your daily Chrome — driving the primary profile is a
repeated foot-gun (CDP attach can hang and block clicks; background-tab timer
throttling stalls presenter heartbeats; active-tab drift). Keep the tab count
low: each tab holds a WebSocket, and piling them up can wedge new pages on
"Connecting…".

## Key dependencies

| Package          | Version       | Purpose                        |
| ---------------- | ------------- | ------------------------------ |
| next             | ^16.2.12      | Framework                      |
| react            | ^19.2.8       | UI                             |
| tailwindcss      | ^4.3.3        | Styling                        |
| mdx-bundler      | ^10.1.1       | MDX processing                 |
| @xyflow/react    | ^12.11.2      | Walkthrough node-graphs        |
| motion           | ^12.43.0      | Interactive transitions        |
| kbar             | 0.1.0-beta.48 | Command palette (Cmd+K)        |
| @playwright/test | ^1.61.1       | E2E + visual tests             |
| storybook        | ^10.5.5       | Component docs **and tests**   |
| typescript       | ^6.0.3        | Types                          |
| @biomejs/biome   | 2.5.6         | Lint + format                  |

Storybook is not optional tooling here — see
[tests/AGENTS.md](../tests/AGENTS.md#storybook-is-part-of-the-test-suite).

## Dependencies held back on purpose

Anything in this list is **pinned below latest for a reason**. Check here before
"just bumping it" — and if you clear a blocker, delete the row.

| Package                  | Held at   | Latest | Why, and what unblocks it                                                                                                                                                                                                                                                                    |
| ------------------------ | --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typescript`             | `^6.0.3`  | 7.0.2  | TS 7 removed `baseUrl`, and `rollup-plugin-dts` — which `tsup` vendors to emit `.d.ts` — declares `typescript: ^4.5 \|\| ^5.0 \|\| ^6.0` and crashes on TS 7 internals. That breaks `pnpm build` in **@rtkelly13/design-system**, so the blog stays on 6 to keep the pair aligned. Unblocked when `rollup-plugin-dts` supports TS 7 (or the design system moves off `tsup`, e.g. to `tsdown`). |
| `katex`                  | `^0.16.47`| 0.18.1 | `rehype-katex@7.0.1` depends on `katex: ^0.16.0` and has no newer release. Unblocked when `rehype-katex` ships a katex 0.18-compatible major.                                                                                                                                                  |
| `@playwright/test`, `playwright`, `playwright-core` | `1.61.1` (pnpm override) | 1.62.1 | Not a compatibility problem — a **deliberate** one. Bumping Playwright changes the bundled Chromium, which invalidates every committed visual baseline. Keeping it fixed means a snapshot diff reflects *our* CSS change, not a browser change. Bump it in a PR of its own, then `/update-snapshots`. |

### Why some Biome rules are off for `css/tailwind.css`

`biome.json` disables two CSS rules for that file only, and both exemptions are
about the design system's architecture rather than sloppiness:

- **`complexity/noImportantStyles`** — the token layer deliberately uses
  `!important` to beat Tailwind's generated utilities.
- **`style/noDescendingSpecificity`** — theme overrides like
  `.sketch .ascii-divider::after` (specificity `0,2,1`) are declared *before* the
  base `.ascii-divider::after` (`0,1,1`). Biome reads that as a descending-
  specificity mistake, but it is the point: the higher-specificity theme rule
  must win regardless of source order. Reordering to satisfy the rule would be
  actively wrong here — see the Tailwind v4 ordering warnings in
  [design-system.md](./design-system.md).

`public/` is excluded from Biome entirely. It holds only generated artifacts
(OG-image manifest, search indexes, exported draw.io SVGs); Biome 2.5.x lints
CSS inside SVG `<style>` blocks, which produced ~150 diagnostics against
machine-generated diagram exports.

## Notes

- `next-remote-watch` powers content hot-reload in the `start` script.
- Mixed JS/TS in the data layer (`siteMetadata.js` vs `headerNavLinks.ts`).
- Storybook uses the Vite adapter (`@storybook/nextjs-vite`).

## Accessibility and long-term intent

- [accessibility.md](./accessibility.md) — the WCAG target, what is enforced
  where, and the known gaps.
- [graphics-legibility.md](./graphics-legibility.md) — why a backdrop is
  constrained from above, and the numbers that follow.
- [ADR 0009](./adr/0009-design-system-is-the-durable-asset.md) — why the effort
  here is disproportionate to a blog on purpose.
