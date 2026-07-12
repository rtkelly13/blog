# Auto-collected bibliography with durable archive links

## Context

Posts and talks link out constantly, and external links rot. We wanted every
document to end with a bibliography that (a) requires no authoring effort and
(b) stays useful after the target dies — i.e. keeps both the original URL and
an archived copy.

The upstream template this blog descends from
(`timlrx/tailwind-nextjs-starter-blog`) already ships bibliography support via
[`rehype-citation`](https://github.com/timlrx/rehype-citation): a BibTeX/CSL
model where the author maintains a `.bib` file and cites entries with `[@key]`
syntax, rendered in a chosen citation style (APA, Chicago, …). We evaluated
adopting it directly.

It doesn't fit the goal. `rehype-citation` is built for **formal academic
sourcing** — hand-curated references to books and papers — and has **no notion
of an archived/Wayback copy**, which is the whole point here. It also pushes
per-link bookkeeping onto the author. What we want is the inverse: harvest the
links already in the prose, automatically, and make each durable.

## Decision

Implement a purpose-built pipeline (`lib/remark-references.ts`,
`components/References.tsx`, `types/Reference.ts`) rather than adopt
`rehype-citation`:

- **Automatic collection.** A remark plugin harvests every external (`http(s)`)
  link, deduped by URL and numbered `[n]` in order of first appearance. No
  `.bib` file, no `[@key]` markup.
- **Durability is first-class.** Each entry carries the original URL *and* a
  Wayback Machine URL (`web.archive.org/web/<url>`, latest snapshot).
  `scripts/archive-links.mjs` (`pnpm archive-links`) submits referenced URLs to
  Save Page Now so a capture exists.
- **Blog vs. talks.** Blog posts get inline `[n]` markers + an auto-appended
  section (via `getFileBySlug`). Talk slides stay clean; the deck landing page
  renders a Links section extracted from the whole talk body in one
  deterministic pass (`lib/references.ts`), because slides compile in parallel.

Even so, we **borrowed the good ergonomics** from `rehype-citation` rather than
reinventing them:

- **Linked citations** (its `linkCitations`): every `[n]` marker anchors to its
  entry, and the entry has a ↩ backlink to the first citation.
- **Hover tooltips** (its `showTooltips`): each marker gets a `title` with the
  full entry (`[n] Title — domain`).
- **Placement override** (its `[^ref]` tag): an author can drop `<References />`
  anywhere in the body to render the bibliography there instead of at the end.
  The plugin detects the node and sets `manualPlacement`, which the layout reads
  to suppress its auto-appended section. Inline `<References />` reads the
  collected list from `ReferencesContext` (provided by the layout), so it needs
  no props.

We deliberately did **not** reuse `rehype-citation`'s `[^ref]` token for
placement: `[^…]` is GFM footnote syntax in our remark pipeline and would
collide. An MDX component is unambiguous and idiomatic here.

- **Featured links** (a boost for the most valuable sources). A post/talk
  frontmatter `featuredLinks: [url | { title, url }]` renders a pinned
  "★ Featured" group at the top of the References section. A featured URL that
  is also cited inline is flagged and shown there (keeping its `[n]` and
  backlink); one that isn't cited is added as a numberless entry (like
  rehype-citation's `noCite`). This exists to kill a redundancy: posts used to
  hand-maintain a "Links" list at the end that then *duplicated* the auto
  references. Authors delete that list and boost the same URLs instead —
  they're highlighted, still carry an archived copy, and appear exactly once.

## Consequences

- Zero authoring effort for the common case; any external link is a reference.
  The trade-off is that we do **not** support formal CSL-styled academic
  citations. If a genuinely academic post ever needs BibTeX/CSL, `rehype-citation`
  can be added alongside this — the two are complementary, not mutually
  exclusive (one cites curated sources, the other archives inline links).
- "Archived" links only resolve once `pnpm archive-links` has been run for the
  referenced URLs; the link shape is valid regardless, and Save Page Now is
  best-effort.
- A new hard dependency on `remark-parse` + `remark-mdx` for the standalone
  talk extraction path.
- Author-facing escape hatch: `<References />` for placement. Documented in
  `lib/AGENTS.md`.
