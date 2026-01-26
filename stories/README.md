# Storybook Design System

This directory contains Storybook stories for the blog's design system components.

## Running Storybook

```bash
# Development mode (with hot reload)
pnpm storybook

# Build static version
pnpm build-storybook
```

Storybook runs on http://localhost:6006 in development mode.

## Stories Organization

### Design Sandbox Stories

These stories are ported from the `/design-sandbox` pages and showcase the brutalist design system:

- **Buttons.stories.tsx** - All button variations with different colors, sizes, and shadow effects
- **Cards.stories.tsx** - Card component variations (basic, with images, with ASCII art)
- **Typography.stories.tsx** - Typography system including headings, body text, terminal prompts, code blocks, links, and tags

### Component Stories

- **Button.stories.tsx** - Individual Button component with interactive controls

## Adding New Stories

Stories use the CSF (Component Story Format) 3.0 syntax:

```tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Component from "../components/Component";

const meta = {
  title: "Category/ComponentName",
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

## Styling

Tailwind CSS v4 is configured in `.storybook/preview.ts` by importing `../css/tailwind.css`. All Tailwind classes and custom brutalist utilities are available in stories.

The dark background (`#000000`) is set as the default in the preview configuration.

## Configuration Files

- **.storybook/main.ts** - Storybook configuration (framework, addons, story locations)
- **.storybook/preview.ts** - Global preview settings (backgrounds, Tailwind import)
- **.storybook/vitest.setup.ts** - Vitest integration setup

## Addons

- **@storybook/addon-a11y** - Accessibility testing
- **@storybook/addon-docs** - Auto-generated documentation
- **@storybook/addon-vitest** - Vitest integration for component testing
- **@chromatic-com/storybook** - Visual regression testing with Chromatic

## Notes

- Stories follow the same brutalist aesthetic as the main site
- All components use monospace fonts and hard borders
- Terminal prefixes (`>`, `$`, `//`, `[  ]`) are used throughout
- Color palette: cyan (#22d3ee), pink (#ec4899), yellow (#facc15), neon green (#39ff14)
