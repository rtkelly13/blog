# AGENTS.md

Personal blog for Ryan Kelly (ryankelly.dev): Next.js 16 + React 19, Tailwind
CSS v4, MDX content, a brutalist design system, and a Convex-backed live-talk
platform. Package manager is **pnpm** (`node >=22`).

This file is a **router**. It carries only what applies everywhere; domain
detail lives in the guides below and loads when you need it.

## Authorship policy (READ FIRST)

**The prose a reader reads is human-authored — agents must not draft, ghostwrite,
or reword the narrative body of posts/talks in `data/blog/**` and
`data/talks/**`.** Agents own everything *around* the words (structure,
components, diagrams, assets, tooling, tests). Full policy:
**[docs/posting.md](./docs/posting.md#authorship-policy-read-first)**.

## Guides

| Domain | Guide | Covers |
| ------ | ----- | ------ |
| **Design system** | [docs/design-system.md](./docs/design-system.md) | Brutalist tokens, dual-mode (neon-terminal + sketch) theming, anti-patterns, Tailwind v4, the `@rtkelly13/design-system` npm package + `ds:link` local dev |
| **Technical guide** | [docs/technical-guide.md](./docs/technical-guide.md) | Stack, commands, build pipeline, CI/CD, branch workflow, browser control, deps |
| **Posting** | [docs/posting.md](./docs/posting.md) | Authorship policy, MDX frontmatter, citations/OG, the ideas workbench |
| **Talks** | [docs/talks.md](./docs/talks.md) | Deck MDX, live/present/admin routes, Convex backend, auth, live E2E |

Area-scoped `AGENTS.md` files sit next to the code and merge in automatically
when you work there:

- [components/AGENTS.md](./components/AGENTS.md) — React components, header
  primitives, design-system components, talk widgets
- [lib/AGENTS.md](./lib/AGENTS.md) — MDX pipeline, remark/rehype plugins, OG engine
- [convex/AGENTS.md](./convex/AGENTS.md) — realtime backend (talk sessions, Q&A, polls)
- [tests/AGENTS.md](./tests/AGENTS.md) — Playwright + Vitest, regression suite

## Where to look

| Task | Location | See |
| ---- | -------- | --- |
| Add / edit a blog post | `data/blog/<slug>.mdx` | [posting.md](./docs/posting.md) |
| Add / edit a talk deck | `data/talks/<slug>.mdx` | [talks.md](./docs/talks.md) |
| Evolve an idea pre-draft | `data/ideas/<slug>.mdx`, `/ideas` | [posting.md](./docs/posting.md#ideas-workbench-pre-drafting) |
| Site config | `data/siteMetadata.js` | — |
| Components / layouts | `components/`, `layouts/` | [components/AGENTS.md](./components/AGENTS.md) |
| Colours, shadows, themes | `css/tailwind.css` (tokens come from `@rtkelly13/design-system/theme.css`) | [design-system.md](./docs/design-system.md) |
| Design-system package dev | `pnpm ds:link` / `pnpm ds:unlink` (never commit the `link:` override) | [design-system.md](./docs/design-system.md#package-source--local-development) |
| Deploying this Storybook | `storybook-site/vercel.json` (second Vercel project) | [storybook-site/README.md](./storybook-site/README.md) |
| MDX / remark plugins | `lib/mdx.ts`, `lib/remark-*.ts` | [lib/AGENTS.md](./lib/AGENTS.md) |
| Realtime backend | `convex/` | [convex/AGENTS.md](./convex/AGENTS.md) |
| Talk / live routes | `pages/talks/`, `pages/live/`, `pages/admin.tsx` | [talks.md](./docs/talks.md) |
| Tests / visual snapshots | `tests/*.spec.ts` | [tests/AGENTS.md](./tests/AGENTS.md), [technical-guide.md](./docs/technical-guide.md#cicd) |

## Non-standard gotchas

- **Tailwind v4** — `css/tailwind.css` uses `@import "tailwindcss"`, not
  `@tailwind` directives; PostCSS uses `@tailwindcss/postcss`.
- **Visual snapshots regenerate on CI only, and only when asked** — the PR gate
  compares, never writes. Comment `/update-snapshots` (or run
  `pnpm test:snapshots:remote`) once you've confirmed the diff is intentional.
  Never commit macOS-rendered PNGs.
- **Linear history** — rebase onto `main`, squash-merge PRs; no merge commits.
- **Build needs `@rtkelly/mermaid-toolkit`** built first (handled in CI).

## Agent skills

- **Issue tracker** — issues/PRDs as local markdown under `.scratch/<slug>/`
  (`docs/agents/issue-tracker.md`).
- **Triage labels** — five canonical roles (`docs/agents/triage-labels.md`).
- **Domain docs** — single-context `CONTEXT.md` + `docs/adr/`
  (`docs/agents/domain.md`).

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->


## 🛑 Repository Conventions & Workflow Policy

1. **Squash Merge Only**: All pull requests must be merged into `main` using **Squash and Merge** exclusively.
2. **Delete Branch on Merge**: Feature branches must be automatically deleted immediately upon merge into `main`.
3. **Linear History**: Maintain a strictly linear history. Rebase feature branches onto `main` before merging; no merge commits allowed.
4. **Direct Push Protection**: Non-force direct pushes to `main` are blocked; PR mechanism required (force pushes permitted when needed).


## 🛑 Repository Conventions & Workflow Policy

1. **Squash Merge Only**: All pull requests must be merged into `main` using **Squash and Merge** exclusively.
2. **Delete Branch on Merge**: Feature branches must be automatically deleted immediately upon merge into `main`.
3. **Linear History**: Maintain a strictly linear history. Rebase feature branches onto `main` before merging; no merge commits allowed.
4. **Direct Push Protection**: Non-force direct pushes to `main` are blocked; PR mechanism required (force pushes permitted when needed).
5. **Local Temp & Worktree Directory**: All temporary files, local databases, scratch files, and git worktrees MUST go inside the root `/temp/` directory (gitignored).
6. **Gitignored Local TODO File**: A root `TODO.md` file MUST exist for local task tracking and be gitignored.
