# Ryan Kelly's Blog

Personal blog for sharing technical knowledge, tutorials, and insights.

**Live site:** [ryankelly.dev](https://ryankelly.dev)

## Tech Stack

- **Framework:** Next.js 16 with React 19
- **Styling:** Tailwind CSS v4
- **Content:** MDX (Markdown + React components)
- **Hosting:** Vercel
- **Comments:** Giscus (GitHub Discussions)

Based on [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog).
The blog has diverged significantly from the template in both directions — see
[docs/template-divergence.md](./docs/template-divergence.md) for a two-way diff of ideas
unique to this blog (back-port candidates) and upstream ideas worth bringing in.

## Quick Start

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server at http://localhost:3000
pnpm storybook  # View design system at http://localhost:6006
pnpm build      # Production build
pnpm test:e2e   # Run tests
```

## Design System

The brutalist design system is documented in Storybook. View component variations, typography styles, and usage examples:

```bash
pnpm storybook
```

Stories are located in `stories/` and include:

- Button variations (colors, sizes, shadows)
- Card layouts (basic, with images, with ASCII art)
- Typography system (headings, code blocks, terminal prompts)

## Writing Content

Blog posts are MDX files in `data/blog/`. Create a new post:

```yaml
---
title: "Post Title"
date: "2026-01-15"
tags: ["tag1", "tag2"]
summary: "Brief description"
---
Your content here...
```

## Contributing

See [AGENTS.md](./AGENTS.md) for development workflow, testing, and deployment details.

## License

MIT
