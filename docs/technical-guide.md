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
pnpm build                 # next build + sitemap + search + tag-rss + OG images

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
├── scripts/generate-sitemap.mjs
├── scripts/generate-search.mjs
├── scripts/generate-tag-rss.mjs
└── scripts/generate-og-images.mjs   # deterministic per-post OG cards
```

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

| Package          | Version       | Purpose                 |
| ---------------- | ------------- | ----------------------- |
| next             | ^16.2.9       | Framework               |
| react            | ^19.2.7       | UI                      |
| tailwindcss      | ^4.3.1        | Styling                 |
| mdx-bundler      | ^10.1.1       | MDX processing          |
| @xyflow/react    | ^12.11.2      | Walkthrough node-graphs |
| motion           | ^12.42.2      | Interactive transitions |
| kbar             | 0.1.0-beta.48 | Command palette (Cmd+K) |
| @playwright/test | ^1.61.1       | E2E + visual tests      |
| storybook        | ^10.4.6       | Component docs          |

## Notes

- `next-remote-watch` powers content hot-reload in the `start` script.
- Mixed JS/TS in the data layer (`siteMetadata.js` vs `headerNavLinks.ts`).
- Storybook uses the Vite adapter (`@storybook/nextjs-vite`).
