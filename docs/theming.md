# Theming

The site ships **three themes**, chosen from the header toggle
(`components/ThemeSwitch.tsx`) and cycled in order:

| Key      | Label    | Family | Look                                                        |
| -------- | -------- | ------ | ----------------------------------------------------------- |
| `dark`   | `HIGH`   | dark   | The original brutalist look — pure white on pure black.     |
| `dim`    | `DIM`    | dark   | Softened dark — charcoal `#17171b` bg, off-white `#d8d8d2`.  |
| `sketch` | `SKETCH` | light  | Light "paper & ink" — warm paper bg, graphite ink, pastel/primary accents. |

`dark` is the default (and what server-rendered HTML assumes). The choice is
persisted per-visitor by `next-themes` in `localStorage` under the `theme` key.

## How a theme is applied

`next-themes` (configured in `pages/_app.tsx`) puts **a single class** on
`<html>`: `dark`, `dim`, or `sketch`.

> ⚠️ **One class, no spaces.** next-themes applies the theme with
> `classList.add(value)`, which throws on a value containing a space. So a theme
> maps to exactly one class — do **not** use a multi-class `value` map.

Because `dark` and `dim` are both dark, the Tailwind `dark:` variant is taught
to match **both** (`css/tailwind.css`):

```css
@custom-variant dark (&:where(.dark, .dark *, .dim, .dim *));
```

`sketch` is deliberately **excluded** from that list. That single decision is
what makes a light theme tractable: any `dark:`-prefixed utility (e.g.
`text-gray-700 dark:text-gray-300`) falls back to its **light base** style under
`.sketch`, which is exactly what a light theme wants.

## How re-theming works (CSS variables, not per-component edits)

We do **not** edit the hundreds of `bg-black` / `text-white` / `border-white`
usages. Instead each theme overrides CSS variables in one place
(`css/tailwind.css`), and the utilities follow:

1. **Surface** — Tailwind v4 compiles default-palette colours to
   `var(--color-*)`. Overriding `--color-black`, `--color-white`, and the
   `--color-zinc-*` scale under `.dim` / `.sketch` re-themes every
   `bg-black` / `text-white` / `border-white` / `bg-zinc-900` … in lockstep.
   `body` reads `var(--color-black)` / `var(--color-white)` so the page follows.
2. **Accents** — the brutalist accents are variable-driven in
   `tailwind.config.js`: `brutalist.cyan = var(--brutalist-cyan, #22d3ee)` (and
   `pink`, `yellow`, `neonGreen`, `neonCyan`, `cyberOrange`, `darkBg`). A theme
   re-points them once. Opacity modifiers (`bg-brutalist-cyan/20`) still work
   (Tailwind emits `color-mix`).
3. **Bespoke surfaces** — hand-authored variables for things utilities can't
   reach: `--brutalist-shadow-color` (hard offset shadows), `--scanline-color`
   (the header background lines), the hero (`--brutalist-darkBg`, `--hero-grid`,
   `--hero-grid-strong`, `--hero-ring`, `--hero-ring-glow`, `--hero-ring-soft`),
   and the diagram palette (`--diagram-*`).
4. **Prose** — MDX bodies use `prose prose-invert`; each theme re-points the
   `--tw-prose-invert-*` tokens. A few colours are baked as literals by the
   typography config (headings `#fff`, body `gray-200`, code block) and are
   overridden explicitly under `.dim` / `.sketch`.

To add or retune a theme: edit its block in `css/tailwind.css`. To make a *new*
hardcoded colour themeable: give it a `--…` variable with the dark value as the
fallback, then override under the theme(s).

## Dark vs. light — why sketch is more than a recolour

`dim` is a gentle recolour of the dark theme: it only softens the black/white
poles and the near-black `zinc` surfaces; **accents and layout are unchanged**,
and it keeps the `dark` class semantics (all `dark:` styles still apply).

`sketch` is a **full inversion**, and light backgrounds surface assumptions that
"just work" on a dark canvas:

- **Surface flips.** `--color-black` → paper `#f5f3ec`, `--color-white` → ink
  `#23262e`. The `zinc` scale is inverted (dark panels → light paper tones; the
  light "muted text" tones → dark) so both keep contrast.
- **Accents change hue,** not just value: neon cyan/pink/yellow → blue `#2563eb`
  / red `#dc2626` / green `#15803d`, which read as intentional ink annotations
  on paper rather than glow.
- **`dark:` utilities stop applying** (sketch isn't in the `dark` variant), so
  light-first component pairs render their light base automatically.
- **Light-grey text must be re-inked.** `text-gray-100…400` are *inlined
  literals* (the config maps `gray → neutral`), invisible on paper, so they are
  re-pointed to ink under `.sketch`.
- **Prose body/code re-inked.** The typography config bakes a literal light-grey
  body colour and a dark code block onto `.prose`; both are overridden so the
  reading surface is dark-on-paper with a light code block.
- **Generative backgrounds re-tinted.** The hero (`CyberHero`) is a dark
  cyberpunk panel with a neon-green perspective grid and a glowing ring; under
  sketch its panel becomes light, the grid becomes a faint ink grid, and the
  ring is a soft pastel green. These route through the `--hero-*` variables
  rather than hardcoded `rgba()`.
- **Shadows invert.** The white hard-offset shadows would vanish on paper, so
  `--brutalist-shadow-color` becomes ink.

## Gotchas

- **Adding a new visual element?** If it uses a literal colour (inline
  `style`, an `rgba()`/gradient, a raw hex, or a `gray-*`/`zinc-*` that is an
  inlined literal), it will **not** re-theme — route it through a CSS variable
  and add the sketch (light) value. Test it in `sketch`, not just dark.
- **`gray-*` is inlined** (config maps `gray → colors.neutral`); `zinc-*`,
  `black`, and `white` are variable-driven. Prefer `zinc`/`black`/`white` (or an
  accent var) for anything that should theme automatically.
- **Diagrams** (`components/diagrams/SvgDiagram.tsx`, mermaid) read the
  `--diagram-*` variables and the `dim`/`sketch` value is treated as its family
  (dark asset for dim, light for sketch).

## Known limitations / intentionally un-themed

- **Mermaid diagrams** (`components/diagrams/MermaidDiagram.tsx`) render with the
  fixed dark `retro-brutalist` palette in every theme — unlike `SvgDiagram`,
  which is fully themed via `--diagram-*`. The `@rtkelly/mermaid-toolkit`
  `ThemeEngine` is built with literal accent colours; theming it means wiring its
  `themeVariables` (background / primary / line / text) to the `--diagram-*`
  tokens and re-rendering on theme change. Left as-is for now so a diagram on a
  light page shows as a self-contained dark block (like an embedded editor).
- **Presenter / projection decks** (`components/talks/SpectacleDeck`,
  `DeckLive`, `DeckSidebars`, `TalkTimer`, and `pages/talks/[slug]/present`) are
  intentionally dark, fullscreen surfaces and use literal colours. They do not
  track the site theme by design.
- **`/design-sandbox/*` and `/experiments/*`** galleries (and Storybook stories)
  deliberately showcase the neon look with literal colours; they are internal
  and not part of the shipped reading experience.
- **Decorative text glows** (`drop-shadow-[…rgba(255,255,255,…)]` etc.) simply
  disappear on the light sketch background rather than re-tinting; the text
  underneath stays legible, so this is cosmetic.

## Tests

- `tests/theme-toggle.spec.ts` — functional (computed-style) coverage of the
  toggle cycle and each theme's tokens on the homepage and a blog post.
- `tests/visual.spec.ts` — visual-regression snapshots per theme across the
  basic pathways (homepage, blog listing, blog post, tags, about, talks).
  Regenerate baselines on CI by commenting `/update-snapshots` on the PR.
