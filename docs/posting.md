# Posting mechanism — blog content

How blog posts are authored and processed. Talks are separate — see
[talks.md](./talks.md).

## Authorship policy (READ FIRST)

**The prose is human-authored. The words a reader reads are written by Ryan.**

This blog is working toward *fully human-authored words*. The narrative body of
every post and talk — the sentences and paragraphs in `data/blog/**` and
`data/talks/**` — is written by the human author. Agents must **not** draft,
ghostwrite, or rewrite that prose, or "polish" it into their own phrasing. When
a post's body is still an AI-generated draft, treat it as a scaffold to be
replaced by the author's own words, not as finished copy.

**Agents assist with everything *around* the words** — this is the point:

- **Shape, not sentences** — propose an outline, section order, or where an idea
  belongs; flag a missing or overlong section. Leave the wording to the author.
- **Peripheral & utility artifacts** — diagrams (`<Diagram>`/Mermaid), header
  and OG images (`lib/og/`), code samples, tables, frontmatter, tags, file
  scaffolding, MDX component wiring, links, asset generation.
- **Mechanics** — fix typos, broken links, Markdown/MDX syntax, formatting;
  never reword for content.
- **Everything outside `data/`** — components, layouts, `lib/`, tests, build
  tooling, CI — is normal agent territory.

Reader-facing prose metadata (a post `summary`) may be *drafted* by an agent as
a suggestion, but the author owns the final wording.

Rule of thumb: **if a reader reads it as the author's voice, a human wrote it;
if it's structure, code, or an asset, an agent can.**

Related policy: organisational specifics (employer repo names, ticket IDs,
internal identifiers, colleague attribution) are excluded from **all**
source-controlled content, including `data/ideas/` — see
[ADR-0008](adr/0008-no-organisational-specifics-in-source-controlled-content.md).

## Adding a post

A post is one MDX file: `data/blog/<slug>.mdx`. `scripts/create-post.mjs`
scaffolds one with valid frontmatter. Frontmatter schema
(`types/PostFrontMatter.ts`):

```yaml
title: string        # Required
date: string         # Required (YYYY-MM-DD)
tags: string[]       # Required
summary: string      # For SEO / cards
draft: boolean       # Hide from production
layout: string       # Optional (default: PostLayout)
featuredLinks:       # Optional — boost links to a ★ Featured group (ADR-0007)
  - { title: string, url: string }   # or a bare url string
series:              # Optional multi-part posts
  name: string
  order: number
bibliography: string # Optional .bib / CSL-JSON in data/ for [@BibKey] citations
```

## Content features

- **MDX processing** — `lib/mdx.ts` (bundleMDX + custom remark/rehype plugins).
  See [lib/AGENTS.md](../lib/AGENTS.md).
- **Bibliography / citations** — `[@BibKey]` references resolve via
  `lib/remark-references.ts` into auto `[n]` citations and a References section
  (original + archived link per entry). `pnpm archive-links` saves URLs to the
  Wayback Machine. See [lib/AGENTS.md](../lib/AGENTS.md) → remark-references.
- **OG / header images** — deterministic SVG engine in `lib/og/`; per-post OG
  cards are generated at build time. See [lib/AGENTS.md](../lib/AGENTS.md).
- **Diagrams** — `<Diagram type="mermaid|svg|reactflow" .../>`; see
  [components/AGENTS.md](../components/AGENTS.md) and
  [talks-graphics.md](./talks-graphics.md).

## Ideas workbench (pre-drafting)

`data/ideas/**` + `/ideas` (admin-only) is where posts and series **evolve
before drafting**. An idea is MDX with its own frontmatter
(`types/IdeaFrontMatter.ts`: `kind`, `status`, …) rendered by `IdeaLayout`.
Interactive prototypes (IdeaDeck, Walkthrough, Terminal, QueryRouter, FileTree)
are iterated here, then promoted into a post when they earn it. The interactive
MDX components are documented in [components/AGENTS.md](../components/AGENTS.md).
