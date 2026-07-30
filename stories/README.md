# Storybook Design System

This directory contains Storybook stories for the blog's design system.

## Why Storybook is here

Not for the published docs site — **for the tests.** `vitest.config.ts` has a
`storybook` project that runs every story in this repo as a real browser test, so
`pnpm test` covers 16 story files / 62 tests through Storybook. Each story is a
render test, an interaction test (if it has `play`), and an axe a11y pass.

That makes the stories load-bearing: removing Storybook would remove those tests.
See [../tests/AGENTS.md](../tests/AGENTS.md#storybook-is-part-of-the-test-suite)
for the full picture, including why the blog keeps stories for components that
`@rtkelly13/design-system` also covers.

## Running Storybook

```bash
# Development mode (with hot reload)
pnpm storybook

# Build static version
pnpm build-storybook
```

Storybook runs on http://localhost:6006 in development mode.

## Theme toolbar

The toolbar (paintbrush icon) cycles **HIGH (dark) / DIM / SKETCH** by setting
the theme class on `<html>`, exactly as `next-themes` does on the site. Every
story must read as intentional in both HIGH and SKETCH — see
`Foundations/Paper & Ink` for the paper ↔ terminal token analogy.

## Organization (composition tiers)

- **Foundations** (`stories/foundations/`) — the tokens themselves:
  - `Colors.stories.tsx` — accent / surface / muted-text swatches, built on
    token classes so they re-map per theme
  - `Typography.stories.tsx` (in `stories/`) — font roles, headings, body,
    terminal prompts, code, links, tags
  - `BordersAndShadows.stories.tsx` — borders, hard shadows, press
    interaction, terminal-vs-paper motifs
  - `PaperAndInk.mdx` — the SKETCH metaphor, token by token
- **Atoms** (colocated in `components/`) — `Button`, `Tag`, `Link`,
  `BracketText`, `PageTitle`, `NoteBlock`, `TLDR`
- **Molecules** (colocated in `components/`) — `Card`, `PageHeader`,
  `Pagination`, `PostHeaderImage`
- **Design Sandbox** (`stories/`) — exploratory catalogs ported from
  `/design-sandbox` (`Buttons`, `Cards`)

## Adding New Stories

Stories use the CSF (Component Story Format) 3.0 syntax. Colocate component
stories next to the component (`components/Foo.stories.tsx`) and title them by
tier (`Atoms/Foo`, `Molecules/Foo`):

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Component from "../components/Component";

const meta = {
  title: "Atoms/ComponentName",
  component: Component,
  parameters: {
    layout: "padded", // or 'centered', 'fullscreen'
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Component>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // component props
  },
};
```

Build only on remapped tokens (`bg-black`, `text-white`, `text-zinc-400`,
`text-brutalist-*`, `shadow-hard-*`) — never hex literals or `dark:` pairs —
and verify the story under both HIGH and SKETCH before committing.

## Configuration Files

- **.storybook/main.ts** - Storybook configuration (framework, addons, story locations)
- **.storybook/preview.tsx** - Theme toolbar + decorator, Tailwind import, a11y config
- **.storybook/vitest.setup.ts** - Vitest integration setup

## Addons

- **@storybook/addon-a11y** - Accessibility testing
- **@storybook/addon-docs** - Auto-generated documentation
- **@storybook/addon-vitest** - Vitest integration for component testing

Visual regression is handled by Playwright (`pnpm test:regression`), not
Chromatic — there is no Chromatic project wired up to this repo.

## Notes

- Stories follow the same brutalist aesthetic as the main site
- Terminal prefixes (`>`, `$`, `//`, `[  ]`) are used throughout in HIGH;
  SKETCH renders their paper analogues (pencil dashes, blue-pen prompts)
- The audit behind this structure: `docs/design-system-evaluation.md`
