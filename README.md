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

## Quick Start

```bash
pnpm install    # Install dependencies
pnpm dev        # Start dev server at http://localhost:3000
pnpm build      # Production build
pnpm test:e2e   # Run tests
```

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
