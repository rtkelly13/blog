# Design system

The blog's look is a **brutalist / neon-terminal** aesthetic: hard edges, zero
border-radius, offset shadows with no blur, a tight neon palette on black, and
`[ BRACKETED ]` display type. It ships as **two first-class modes driven by one
token set** — see [Dual-mode theming](#dual-mode-theming).

## Package source & local development

`@rtkelly13/design-system` is installed from the public **npm registry** —
no auth needed anywhere (it publishes from the design-system repo via npm
trusted publishing). To develop against the sibling `../design-system`
checkout instead:

- `pnpm ds:link` — links the local repo via `pnpm link`. **This writes a
  `link:../design-system` override into `package.json` and the lockfile
  (pnpm v10 behavior) — never commit those**; the lockfile protocol guard
  rejects them. Rebuild the design system (`pnpm build` there) to see
  changes; the link is a symlink, so no reinstall needed.
- `pnpm ds:unlink` — removes the link/override and restores the registry
  version. Run it before committing any dependency changes.

Never commit a `file:../design-system` specifier — Vercel clones only this
repo, so the path doesn't exist there and every deploy fails at `pnpm install`.

## Tokens

Defined in the design-system package's `theme.css` (`@theme` block; accents
read through CSS variables so themes can re-point them in one place). The
blog's `css/tailwind.css` overrides where its behavior deliberately diverges —
e.g. `.dim` pins the accents back to the dark values, where the DS softens
them (see `tests/theme-toggle.spec.ts`).

| Token              | Value (dark)      | Usage               |
| ------------------ | ----------------- | ------------------- |
| `brutalist-cyan`   | `#22d3ee`         | Links, primary accent |
| `brutalist-pink`   | `#ec4899`         | Hover, highlights   |
| `brutalist-yellow` | `#facc15`         | Warnings, emphasis  |
| Borders            | 2px solid white   | All borders, always |
| Border-radius      | `0px`             | Globally enforced   |
| Shadows            | `shadow-hard-*`   | 4px offset, no blur |
| Display font       | Space Grotesk (`font-display`) | Headings / page titles |
| Body font          | Inter (`font-sans`)            | Body / reading copy    |
| Mono font          | IBM Plex Mono (`font-mono`)    | Code + UI / metadata   |
| Pixel font         | VT323 (`font-pixel`)           | Logo + hero accents    |

## Anti-patterns (enforced)

- **No rounded corners** — `borderRadius: 0` globally.
- **No subtle shadows** — `shadow-hard-*` only (offset, no blur).
- **No soft colours** — stick to the brutalist palette.
- **No emoji as UI** — native emoji render as fixed full-colour OS glyphs that
  ignore the theme; use lucide icons tinted with a `text-brutalist-*` accent.

## Tailwind v4 (non-standard)

```css
/* css/tailwind.css — NOT @tailwind directives */
@import "tailwindcss";
@import "@rtkelly13/design-system/theme.css"; /* brutalist tokens, .dark/.dim variant, @source */
@plugin "@tailwindcss/typography";
@config "../tailwind.config.js"; /* only for the typography() callback now */
```

PostCSS uses `@tailwindcss/postcss` (not `tailwindcss`). Never use the v3
`@tailwind base/components/utilities` directives.

## Dual-mode theming

Three themes cycle from the header toggle: **`dark`** (HIGH, the default
neon-terminal look), **`dim`** (softened dark), and **`sketch`** (light
paper-and-ink, blue/red/green accents). `dark` and `sketch` are both
first-class — every surface must read as intentional in both.

The mechanism: `.sketch` / `.dim` **remap the colour tokens themselves**
(`--color-black`, `--color-white`, the `--color-zinc-*` scale, the
`--brutalist-*` accents) in `css/tailwind.css`, so utilities built on those
tokens invert automatically. The discipline for any new component:

- **Build only on remapped tokens** — `bg-black`/`bg-zinc-900`,
  `border-white`, `text-white`, `text-zinc-400`, `text-brutalist-*`,
  `shadow-hard-*`. Write the dark look and sketch comes for free.
- **Never hardcode** `text-gray-900`, `dark:*` pairs, or hex literals for
  surface/text/border colour — the grey scale and literals don't remap.
- **Verify both** — cycle HIGH → DIM → SKETCH and confirm it reads on paper as
  well as on black.

Full mechanics and the per-token tables: **[docs/theming.md](./theming.md)**.

### The paper ↔ terminal analogy

Sketch is not a "light mode" — it is the same system printed on paper. Each
terminal device has an explicit paper analogue at the token level:

| Terminal (HIGH)            | Token / mechanism                | Paper (SKETCH)              |
| -------------------------- | -------------------------------- | --------------------------- |
| Black screen               | `--color-black`                  | Warm paper sheet            |
| White phosphor text        | `--color-white`                  | Graphite ink                |
| Neon cyan / pink / yellow  | `--brutalist-*`                  | Blue pen / red pen / green marker |
| Hard neon shadow           | `--brutalist-shadow-color`       | Letterpress ink offset      |
| Green scanlines            | `--scanline-color` / `--page-texture` | Pencil-hatch texture   |
| `//====//` ASCII divider   | `.ascii-divider`                 | Hand-ruled pencil dashes    |
| Solid strokes              | mermaid `stroke-dasharray`       | Pencil-sketched outlines    |
| Block-cursor selection     | `::selection` (sketch remap)     | Highlighter-marker swipe    |

The full table with atomic-structure notes lives in Storybook
(`Foundations/Paper & Ink`, from `stories/foundations/PaperAndInk.mdx`); the
audit that produced it is
**[docs/design-system-evaluation.md](./design-system-evaluation.md)**.

## Components & primitives

Component-level guidance (the `PageHeader` / `PageTitle` header primitives, the
per-section accent rule, diagrams, search, talk widgets) lives in
**[components/AGENTS.md](../components/AGENTS.md)**. Live component variations
render in the **design sandbox** (`/design-sandbox`) and in Storybook
(`pnpm storybook`, :6006).
