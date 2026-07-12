# LIB

## OVERVIEW

MDX processing pipeline, custom remark/rehype plugins, and utility functions.

## STRUCTURE

```
lib/
├── mdx.ts              # Core MDX bundler (getFileBySlug, getAllFilesFrontMatter)
├── talks.ts            # Talk deck loading (front matter, slide split, MDX compile)
├── tags.ts             # Tag extraction (getAllTags)
├── series.ts           # Series navigation (getSeriesWithPosts, getSeriesNavigation)
├── generate-rss.ts     # RSS feed generation
├── convexClient.ts     # Convex browser client + isConvexConfigured guard
├── usePresence.ts      # Hook: presence heartbeat + live count/join feed
├── useReactions.ts     # Hook: debounced emoji reactions + recent feed
├── machineId.ts        # Pseudo-anonymous localStorage machine id (dedup)
├── remark-code-title.ts    # Code block titles plugin
├── remark-toc-headings.ts  # TOC extraction plugin
├── remark-img-to-jsx.ts    # Image → JSX plugin
└── utils/              # Small helpers
    ├── files.ts        # getAllFilesRecursively
    ├── kebabCase.ts    # Slug generation
    ├── formatDate.ts   # Date formatting
    ├── htmlEscaper.ts  # RSS escaping
    └── showDrafts.ts   # Draft visibility check
```

> **(#19) Hooks are a new `lib/` category.** `lib/` was originally scoped to the
> MDX pipeline + utilities; it now also holds React hooks (`usePresence`,
> `useReactions`) and the shared `machineId` client helper for the talk system.
> They live at `lib/` top-level (not `components/`) because they are Convex-client
> concerns shared across the talk UI. Only call them where `ConvexProvider` is
> mounted (behind an `isConvexConfigured` guard).

## KEY EXPORTS

### mdx.ts

```typescript
getFiles(type: 'blog' | 'authors' | 'series')  // List MDX files
getFileBySlug(type, slug)                       // Bundle single MDX file
getAllFilesFrontMatter(folder: 'blog')          // All posts with frontmatter
sortPosts(a, b)                                 // Date + series ordering
// Shared plugin factories reused by talks.ts (so slides render like posts):
getRemarkPlugins(toc?)                          // Shared remark stack
getRehypePlugins()                              // Shared rehype stack
setEsbuildBinaryPath()                          // esbuild binary resolution
```

### tags.ts

```typescript
getAllTags(); // Returns { tag: count } mapping
```

### series.ts

```typescript
getAllSeries(); // List all series
getSeriesBySlug(slug); // Single series metadata
getSeriesWithPosts(slug); // Series + all its posts
getSeriesNavigation(slug, currentSlug); // Prev/next within series
```

### talks.ts

Loads talk decks from `data/talks/<slug>.mdx`. Bodies are split into slides on
`---` lines (fence-aware), and each slide's optional speaker notes follow a `???`
line. Reuses `mdx.ts`'s plugin stack (`getRemarkPlugins`/`getRehypePlugins`/
`setEsbuildBinaryPath`) so slides render like blog posts.

```typescript
getAllTalksFrontMatter();            // Published talks, newest first
getTalkSlugs();                      // Published slugs (drafts excluded)
getTalkStaticPaths();                // Shared getStaticPaths for talk routes
getTalkMeta(slug);                   // Front matter + slideCount (no MDX compile)
getTalkBySlug(slug);                 // Front matter + compiled slides (+ notes)
validateTalkFrontMatter(data, slug); // Build-time guard (title/date/durationMins)
// Types: TalkSlide; front matter in types/TalkFrontMatter.ts
```

### Hooks (Convex-client)

```typescript
usePresence(room); // { count, joins } — heartbeats + live head-count feed
useReactions(room); // { recent, react } — debounced emoji sends + recent feed
getMachineId(); // machineId.ts — stable per-browser id (localStorage)
```

## MDX PIPELINE

`mdx.ts` uses `mdx-bundler` with these plugins:

**Remark (Markdown → AST):**

- `remark-gfm` - GitHub Flavored Markdown
- `remark-math` - Math notation
- `remark-github-blockquote-alert` - Alert blocks
- `remark-code-title` - Custom: code block titles
- `remark-toc-headings` - Custom: TOC extraction

**Rehype (AST → HTML):**

- `rehype-slug` - Heading IDs
- `rehype-autolink-headings` - Heading links
- `rehype-katex` - Math rendering
- `rehype-citation` - Citations/bibliography (only when the post's frontmatter
  sets `bibliography:` — a .bib/CSL-JSON filename relative to `data/`)
- `rehype-prism-plus` - Syntax highlighting

## CUSTOM PLUGINS

### remark-code-title.ts

Adds title above fenced code blocks:

````markdown
```javascript:filename.js
const x = 1;
```
````

### remark-toc-headings.ts

Extracts headings into `toc` array for table of contents.

### remark-img-to-jsx.ts

Converts markdown images to Next.js `<Image>` with dimensions.

## DRAFT VISIBILITY

`showDrafts.ts` checks:

- `NODE_ENV !== 'production'` OR
- `SHOW_DRAFTS=true` environment variable

Used by `getAllFilesFrontMatter` to filter draft posts.

## DEPENDENCIES

| Package          | Used By            | Purpose                  |
| ---------------- | ------------------ | ------------------------ |
| mdx-bundler      | mdx.ts             | MDX compilation          |
| gray-matter      | mdx.ts, tags.ts    | Frontmatter parsing      |
| reading-time     | mdx.ts             | Reading time calculation |
| image-size       | remark-img-to-jsx  | Image dimensions         |
| unist-util-visit | All remark plugins | AST traversal            |
