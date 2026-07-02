# CLAUDE.md

Working guidance for AI agents in this repo lives in **[AGENTS.md](./AGENTS.md)**.

Read it first. It is the root of a hierarchical knowledge base; deeper docs cover
specific areas:

- [components/AGENTS.md](./components/AGENTS.md) — React components & design system
- [lib/AGENTS.md](./lib/AGENTS.md) — MDX pipeline & utilities
- [tests/AGENTS.md](./tests/AGENTS.md) — testing, including the **regression-vs-deployed-main**
  suite used to verify dependency upgrades (`pnpm test:regression`)

Everything in `AGENTS.md` applies to Claude Code too — there is no separate guidance here.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
