# COMPONENTS

## OVERVIEW

React components: UI primitives, feature modules (diagrams, search, comments), and MDX integration.

## STRUCTURE

```
components/
├── diagrams/         # Diagram renderers (Mermaid, SVG, ReactFlow)
├── search/           # KBar command palette (Cmd+K)
├── comments/         # Comment providers (Giscus, Utterances, Disqus)
├── social-icons/     # SVG social icons
├── analytics/        # Analytics providers (GA, Plausible, Simple)
├── MDXComponents.tsx # MDX element mapping + MDXLayoutRenderer
├── LayoutWrapper.tsx # Site chrome (header, footer, nav)
└── *.tsx             # UI primitives (Button, Card, Image, etc.)
```

## BARREL EXPORTS

Use these for imports:

- `diagrams/index.ts` → Diagram, MermaidDiagram, SvgDiagram, ReactFlowDiagram
- `social-icons/index.tsx` → SocialIcon
- `comments/index.tsx` → Comments (auto-selects provider)
- `analytics/index.tsx` → Analytics (auto-selects provider)

## KEY COMPONENTS

| Component           | Purpose                   | Props/Notes                           |
| ------------------- | ------------------------- | ------------------------------------- |
| `MDXComponents.tsx` | Maps MDX elements → React | Used by `getMDXComponent()`           |
| `MDXLayoutRenderer` | Renders MDX with layout   | `{layout, mdxSource, ...frontMatter}` |
| `LayoutWrapper`     | Site wrapper              | Header, footer, sticky nav            |
| `BlogActions`       | Post floating actions     | TOC popover, scroll buttons           |
| `SeriesNavigation`  | Multi-part post nav       | Prev/next within series               |
| `Button`            | Brutalist button          | `variant`, `size`, `shadow` props     |
| `Card`              | Content card              | Brutalist borders, hard shadows       |

## DIAGRAMS

Dispatcher pattern: `Diagram.tsx` routes by `type` prop.

```tsx
<Diagram type="mermaid" chart="..." />
<Diagram type="svg" src="/path.svg" />
<Diagram type="reactflow" nodes={[...]} edges={[...]} />
```

Types defined in `diagrams/types.ts`.

## SEARCH (KBAR)

- `SearchProvider.tsx` - Wraps app with KBar context
- `KBarModal.tsx` - Command palette UI
- `SearchButton.tsx` - Trigger button

Actions registered via `kbar` API. Add new commands in SearchProvider.

## CONVENTIONS

- PascalCase filenames
- Default exports for components
- Props interfaces inline or in types.ts
- Barrel exports via index.ts in feature folders
- Stories colocated (e.g., `Button.stories.tsx`)

## STORYBOOK

Components with `.stories.tsx` are documented in Storybook:

- `Button.stories.tsx` - CSF 3.0 with autodocs
- `stories/*.stories.tsx` - Design sandbox examples

Run: `pnpm storybook`
