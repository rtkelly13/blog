# Ryan Kelly's Blog

Personal blog for sharing technical knowledge, tutorials, and insights — plus a
real-time **live-talk platform** where an audience joins from their own devices
to react, ask questions, and answer polls during a presentation.

**Live site:** [ryankelly.dev](https://ryankelly.dev)

## Tech Stack

- **Framework:** Next.js 16 (Pages Router) with React 19
- **Styling:** Tailwind CSS v4 — custom brutalist design system
- **Content:** MDX (Markdown + React components)
- **Backend:** [Convex](https://convex.dev) — real-time talk sessions, presence, Q&A, polls
- **Design system:** Storybook
- **Comments:** Giscus (GitHub Discussions)
- **Newsletter:** Buttondown
- **Hosting:** Vercel

Based on [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog).

## Requirements

- Node.js `>= 22`
- pnpm `>= 9`

## Quick Start

```bash
pnpm install                 # Install dependencies
cp .env.example .env         # Configure environment (see below)
pnpm dev                     # Dev server at http://localhost:3000
```

Other common tasks:

```bash
pnpm storybook               # Design system at http://localhost:6006
pnpm build                   # Production build (+ sitemap, search index, RSS)
pnpm post:create             # Scaffold a new blog post
pnpm post:wizard             # Interactive post composer
```

## Environment

Copy `.env.example` to `.env` and fill in what you need — everything is optional
for a basic build. It covers Giscus comments, the Buttondown newsletter, and the
Convex deployment (`NEXT_PUBLIC_CONVEX_URL` / `CONVEX_DEPLOYMENT`) that powers the
live-talk features. Without Convex, the audience-activity pages show a "not
configured" notice and the rest of the site runs unchanged. See `.env.example`
for the full list and inline notes.

## Project Structure

```
blog/
├── components/   # React components + brutalist design system
├── convex/       # Real-time backend: talk sessions, presence, Q&A, polls
├── data/
│   ├── blog/     # Blog post MDX
│   └── talks/    # Talk deck MDX (slide-split decks)
├── layouts/      # MDX layouts (PostLayout, ListLayout, SeriesLayout, …)
├── lib/          # MDX pipeline, remark/rehype plugins, utilities
├── pages/        # Next.js Pages Router (incl. /talks, /live, /admin)
├── scripts/      # Build scripts (sitemap, search index, RSS, post scaffolding)
├── stories/      # Storybook stories
└── tests/        # Playwright (e2e + visual) and Vitest (unit)
```

## Writing Content

Blog posts are MDX files in `data/blog/`. Scaffold one with `pnpm post:create`,
or add it by hand:

```yaml
---
title: "Post Title"
date: "2026-01-15"
tags: ["tag1", "tag2"]
summary: "Brief description"
draft: false          # optional — hide from production
series:               # optional — multi-part posts
  name: "Series Name"
  order: 1
---

Your content here…
```

## Live Talks

A presenter runs a slide deck (`data/talks/<slug>.mdx`) while the audience joins
from their own devices via `/live` to react, ask questions, and answer polls —
all in real time through Convex. Presenter controls and moderation live behind a
GitHub-authenticated `/admin` surface.

See [`CONTEXT.md`](./CONTEXT.md) for the domain language (Talk vs. Session,
Attendee, Presenter, reveal, moderation) and `docs/adr/` for the design
decisions behind it.

## Design System

The brutalist design system — hard shadows, 2px borders, zero border-radius, and
a cyan/pink/yellow palette on black — is documented in Storybook:

```bash
pnpm storybook
```

Stories live in `stories/` and cover buttons, cards, typography, and
terminal-style UI. Design tokens are defined in `tailwind.config.js`.

## Testing & Quality

```bash
pnpm test:unit               # Vitest unit tests
pnpm test:e2e                # Playwright end-to-end + visual tests
pnpm lint                    # Biome check
pnpm typecheck               # tsc --noEmit
```

Coverage, regression, and snapshot commands are listed in [AGENTS.md](./AGENTS.md).
Visual snapshots are regenerated on CI so they match the runner the checks
compare against.

## Contributing

`main` enforces linear history — rebase feature branches onto `main` (no merge
commits) and land PRs via squash merge, with the PR gate green.

See [AGENTS.md](./AGENTS.md) for the full workflow, architecture, and deployment
details — it's the root of a doc hierarchy with deeper guides under `components/`,
`lib/`, and `tests/`.

## License

[MIT](./LICENSE)
