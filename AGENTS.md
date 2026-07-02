# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-26
**Commit:** e6620e1
**Branch:** main

## OVERVIEW

Personal blog for Ryan Kelly (ryankelly.dev). Next.js 16 + React 19, Tailwind CSS v4, MDX content, brutalist design system.

## STRUCTURE

```
blog/
├── components/       # React components (see components/AGENTS.md)
├── convex/           # Realtime backend — talk sessions, presence, Q&A, polls (see convex/AGENTS.md)
├── lib/              # MDX pipeline, utilities, hooks (see lib/AGENTS.md)
├── tests/            # Playwright + Vitest (see tests/AGENTS.md)
├── layouts/          # 6 MDX layouts (PostLayout, ListLayout, SeriesLayout, etc.)
├── pages/            # Next.js pages router (incl. /talks, /live, /admin)
├── data/             # MDX content + siteMetadata.js
│   ├── blog/         # Blog post MDX
│   └── talks/        # Talk deck MDX (slide-split decks)
├── scripts/          # Build scripts (sitemap, search, RSS)
├── stories/          # Storybook CSF 3.0 stories
├── temp/             # Ignored folder for visual snapshots or temporary outputs
├── types/            # Shared TS types (PostFrontMatter, TalkFrontMatter)
└── .storybook/       # Storybook config (Vite adapter)
```

Talk routes: `pages/talks/` (deck landing + `present` presenter view), `pages/live/`
(the audience-join live surface; `live/manage` redirects to `/admin`).

## WHERE TO LOOK

| Task               | Location               | Notes                                        |
| ------------------ | ---------------------- | -------------------------------------------- |
| Add blog post      | `data/blog/<slug>.mdx` | Frontmatter: title, date, tags, summary      |
| Edit site config   | `data/siteMetadata.js` | Title, socials, analytics, comments          |
| Add/edit component | `components/`          | See components/AGENTS.md                     |
| MDX processing     | `lib/mdx.ts`           | bundleMDX, remark/rehype plugins             |
| Realtime backend / Convex functions | `convex/` | Talk sessions, presence, Q&A, polls — see convex/AGENTS.md |
| Talk deck content  | `data/talks/<slug>.mdx` | Slide-split MDX; frontmatter: `types/TalkFrontMatter.ts` |
| Talk / live routes | `pages/talks/`, `pages/live/`, `pages/admin.tsx` | Deck, audience-join, presenter hub |
| Talk components    | `components/talks/`, `components/admin/` | See components/AGENTS.md              |
| Page layouts       | `layouts/*.tsx`        | PostLayout, ListLayout, SeriesLayout         |
| Remark plugins     | `lib/remark-*.ts`      | Custom: code-title, toc-headings, img-to-jsx |
| Design tokens      | `tailwind.config.js`   | Brutalist colors, shadows, typography        |
| Global CSS         | `css/tailwind.css`     | Tailwind v4 imports, CSS vars, utilities     |
| Tests              | `tests/*.spec.ts`      | See tests/AGENTS.md                          |
| Build scripts      | `scripts/*.mjs`        | sitemap, search, tag-rss, create-post        |

## CONVENTIONS

### Tailwind v4 (Non-Standard)

```css
/* css/tailwind.css - NOT @tailwind directives */
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@config "../tailwind.config.js";
```

PostCSS uses `@tailwindcss/postcss` (not `tailwindcss`).

### Brutalist Design System

| Token              | Value             | Usage               |
| ------------------ | ----------------- | ------------------- |
| `brutalist-cyan`   | #22d3ee           | Links, accents      |
| `brutalist-pink`   | #ec4899           | Hover, highlights   |
| `brutalist-yellow` | #facc15           | Warnings, emphasis  |
| Borders            | 2px solid white   | All borders, always |
| Border-radius      | 0px               | Globally enforced   |
| Shadows            | `hard-*`          | 4px offset, no blur |
| Display font       | Space Grotesk (`font-display`) | Headings / page titles |
| Body font          | Inter (default `font-sans`)    | Body / reading copy    |
| Mono font          | IBM Plex Mono (`font-mono`)    | Code + UI / metadata   |
| Pixel font         | VT323 (`font-pixel`)           | Logo + hero accents    |

### MDX Content

Frontmatter schema (`types/PostFrontMatter.ts`):

```yaml
title: string # Required
date: string # Required (YYYY-MM-DD)
tags: string[] # Required
summary: string # For SEO/cards
draft: boolean # Hide from production
layout: string # Optional (default: PostLayout)
series: # Optional multi-part posts
  name: string
  order: number
```

### Pages Router (Not App Router)

- Uses `pages/` directory with `_app.tsx`, `_document.tsx`
- Dynamic routes: `[...slug].tsx`, `[tag].tsx`, `[page].tsx`
- API routes: `pages/api/newsletter.ts`
- Layouts via `layouts/` + MDXLayoutRenderer wrapper

### Theme

Dark mode forced (`forcedTheme="dark"` in \_app.tsx). ThemeProvider uses class-based switching.

## ANTI-PATTERNS (THIS PROJECT)

- **No rounded corners**: `borderRadius: 0` enforced globally
- **No subtle shadows**: Use `hard-*` shadows only (offset, no blur)
- **No soft colors**: Stick to brutalist palette (cyan, pink, yellow, white on black)
- **No @tailwind directives**: Use `@import "tailwindcss"` (v4 syntax)
- **Visual snapshots**: Update via CI only (`pnpm test:update-snapshots` triggers GitHub Actions)

## COMMANDS

```bash
# Development
pnpm dev                  # Start dev server (Turbopack)
pnpm storybook            # Design system at :6006

# Build
pnpm build                # next build + sitemap + search + tag-rss

# Testing
pnpm test:e2e             # Playwright tests
pnpm test                 # Vitest unit tests
pnpm test:coverage        # Vitest unit tests + coverage (./coverage)
pnpm test:regression      # Diff local build vs deployed main (see tests/AGENTS.md)
pnpm test:update-snapshots # Update visual snapshots via CI

# Quality
pnpm lint                 # Biome check
pnpm typecheck            # tsc --noEmit
pnpm format               # Biome format
```

## BROWSER CONTROL (agent-browser)

Some things can't be tested with a throwaway headless browser: the GitHub-gated
presenter surfaces (`/admin`, and the deck's `?mode=presenter|console`) and
anything behind Convex Auth need a **real, GitHub-logged-in session**.

### Preferred: a dedicated dev profile (`~/.agent-browser-profiles/dev`)

agent-browser drives its **own** Chrome for Testing against a persistent profile
you sign into once — isolated from your daily Chrome, so no attach banner, no
input-hijacking, no tab drift.

```bash
# One-time: sign in (a headed window opens; click "Sign in with GitHub")
agent-browser --profile ~/.agent-browser-profiles/dev --headed open http://localhost:3002/admin

# Thereafter (headless or headed) — the GitHub/Convex session persists:
agent-browser --profile ~/.agent-browser-profiles/dev open <url>
```

Set `AGENT_BROWSER_PROFILE=~/.agent-browser-profiles/dev` to make it the default
and drop the flag. Re-sign-in only when the session expires.

### Fallback: `--auto-connect` to your daily Chrome (avoid)

`--auto-connect` discovers a *running* Chrome (launched with
`--remote-debugging-port=9222 --remote-allow-origins=*`; Chrome 111+ needs the
latter or it silently rejects CDP) and reuses its cookies. It works, but driving
your **primary** profile is fragile and was a repeated foot-gun:

- The live CDP attach shows an "allow remote debugging" state that can **hang and
  block your clicks**. Recover with `pkill -f agent-browser` (drops the daemon),
  or quit Chrome (`osascript -e 'quit app "Google Chrome"'`).
- Background tabs get their `setInterval` **throttled**, so timer-driven code
  (presenter heartbeats/polling) stalls in inactive tabs — the clash count reads
  wrong, though WebSocket queries still update.
- Active-tab drift: you're using the browser, so the "active" target moves under
  automation between calls.

### Gotcha: keep the tab count low

Each open tab holds its own WebSocket/connection. Piling up tabs can **exhaust
the connection pool and wedge new pages on "Connecting…"**. Keep it to the
minimum you're testing (e.g. one driver + one viewer) and close stale tabs.

Concept ref: Chrome DevTools MCP —
https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session

## BUILD PIPELINE

```
pnpm build
├── next build (Turbopack)
├── scripts/generate-sitemap.mjs
├── scripts/generate-search.mjs
└── scripts/generate-tag-rss.mjs
```

Custom: requires building external `@rtkelly/mermaid-toolkit` first in CI.

## CI/CD

Consolidated PR gate — every check runs as its own parallel job, all feed one
required status check (`PR checks`). Modelled on the data-platform pattern, minus
the Sentric composite actions and the `gh aw` agentic comment layer.

```
PR → .github/workflows/pr-checks.yml
      ├── lint        (biome)            blocking ─┐
      ├── typecheck   (tsc --noEmit)     blocking  │
      ├── unit        (vitest +coverage) blocking  ├─► conclusion = "PR checks"
      ├── build       (next build)       blocking  │     • job summary + sticky comment
      └── e2e-visual  (playwright)       blocking ─┘     • coverage delta vs main
                                                          • fails on blocking failures

push main → .github/workflows/ci.yml   # full suite + uploads `coverage-main` baseline
workflow_dispatch → playwright.yml      # manual-only: regenerate Linux snapshots
```

- Each feeder job runs its command with `continue-on-error` and exports its
  outcome; the `conclusion` job aggregates them and is the only merge-blocking check.
- Visual regression (`visual.spec.ts` / `visual-responsive.spec.ts`) runs inside
  `e2e-visual` against a locally built site (no Vercel dependency). **Blocking** —
  intentional visual changes must ship regenerated snapshots (via `playwright.yml`)
  in the same PR.
- Coverage delta is computed deterministically by `scripts/ci/coverage-delta.mjs`
  against the `coverage-main` artifact published by `ci.yml` on each main push.
- Shared setup (mermaid-toolkit checkout + build, pnpm/node install) lives in the
  repo-local composite action `.github/actions/setup-blog`.
- Snapshots must be (re)generated on the CI runner via `playwright.yml`
  (`workflow_dispatch`) so they match what `e2e-visual` compares against.

### Branch workflow

- `main` enforces **linear history** (and merge commits are disabled on the repo).
  Reconcile a feature branch by **rebasing onto `main`** — `git rebase origin/main`
  (resolve conflicts, force-push with `--force-with-lease`) — never with a merge
  commit. PRs land on `main` via **squash merge** only.

## DEPENDENCIES (KEY)

| Package          | Version       | Purpose                 |
| ---------------- | ------------- | ----------------------- |
| next             | ^16.2.9       | Framework               |
| react            | ^19.2.7       | UI                      |
| tailwindcss      | ^4.3.1        | Styling                 |
| mdx-bundler      | ^10.1.1       | MDX processing          |
| kbar             | 0.1.0-beta.48 | Command palette (Cmd+K) |
| @playwright/test | ^1.61.1       | E2E + visual tests      |
| storybook        | ^10.4.6       | Component docs          |

## ENGINE REQUIREMENTS

```json
"engines": {
  "node": ">=22.0.0",
  "pnpm": ">=9.0.0"
}
```

## NOTES

- `preact` in deps is legacy (unused, safe to remove)
- `next-remote-watch` used in `start` script for content hot-reload
- Mixed JS/TS in data layer (`siteMetadata.js` vs `headerNavLinks.ts`)
- Storybook uses Vite adapter (`@storybook/nextjs-vite`)

## Agent skills

### Issue tracker

Issues and PRDs live as local markdown under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the five canonical roles with default strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

---

_See also: [components/AGENTS.md](./components/AGENTS.md), [lib/AGENTS.md](./lib/AGENTS.md), [tests/AGENTS.md](./tests/AGENTS.md)_
