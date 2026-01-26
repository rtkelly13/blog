# LIB

## OVERVIEW

MDX processing pipeline, custom remark/rehype plugins, and utility functions.

## STRUCTURE

```
lib/
├── mdx.ts              # Core MDX bundler (getFileBySlug, getAllFilesFrontMatter)
├── tags.ts             # Tag extraction (getAllTags)
├── series.ts           # Series navigation (getSeriesWithPosts, getSeriesNavigation)
├── generate-rss.ts     # RSS feed generation
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

## KEY EXPORTS

### mdx.ts

```typescript
getFiles(type: 'blog' | 'authors' | 'series')  // List MDX files
getFileBySlug(type, slug)                       // Bundle single MDX file
getAllFilesFrontMatter(folder: 'blog')          // All posts with frontmatter
sortPosts(a, b)                                 // Date + series ordering
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
