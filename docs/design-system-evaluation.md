# Design-system evaluation — Storybook & atomic structure

An audit of the design system against industry practice for specifying a
design system in Storybook, done July 2026. The gaps identified here were
closed in the same change; this doc records the reasoning.

## Strengths (already best-practice)

- **Single-source tokens with theme remapping.** `.dim` / `.sketch` re-point
  Tailwind's own colour variables (`--color-black`, `--color-white`, the zinc
  scale, `--brutalist-*`) in `css/tailwind.css`, so components written once
  against tokens re-theme automatically. This is the pattern CSS-variable-driven
  systems (Style Dictionary et al.) recommend.
- **Documented, enforced anti-patterns** — zero radius, hard shadows only, no
  `dark:` pairs, no hex literals, no emoji as UI (`docs/design-system.md`).
- **Tooling already wired** — Storybook (`@storybook/nextjs-vite`) with a11y,
  vitest, docs and Chromatic addons; a live `/design-sandbox` page.

## Gaps found (and how they were closed)

1. **No theme switching in Storybook.** The preview only offered dark/light
   *canvas backgrounds*; SKETCH and DIM were unreviewable in Storybook, so the
   "verify both modes" discipline couldn't be exercised where components are
   specified. → Fixed: `.storybook/preview.tsx` adds a HIGH / DIM / SKETCH
   toolbar whose decorator sets the theme class on `<html>`, exactly as
   `next-themes` does via `ThemeSwitch`.
2. **No foundations tier.** Industry-standard Storybooks specify tokens first
   (colors, type scale, elevation) as docs-first pages. → Added
   `stories/foundations/`: Colors, Typography (moved + font-role stories),
   Borders & Shadows, and the **Paper & Ink** metaphor page.
3. **Sparse coverage, no hierarchy.** Only `Button` and `PostHeaderImage` had
   component stories, and titles didn't encode composition. → Stories added for
   `Tag`, `Link`, `BracketText`, `PageTitle`, `NoteBlock`, `TLDR` (Atoms) and
   `Card`, `PageHeader`, `Pagination` (Molecules); everything retitled into
   `Foundations / Atoms / Molecules / Design Sandbox`.
4. **The paper metaphor was implicit.** HIGH leans into terminal devices
   (scanlines, `//====//` dividers, `>` prompts, glows) but SKETCH's paper
   analogues were undocumented and incomplete — and the terminal utilities
   themselves hardcoded hex literals, breaking their own remap rule. → The
   token-by-token analogy is now specified in
   `stories/foundations/PaperAndInk.mdx` (and summarised in
   `docs/design-system.md`); `ascii-divider` / `terminal-prompt` /
   `file-extension` now read tokens; SKETCH gained explicit paper motifs:
   hand-ruled pencil-dash dividers, highlighter-yellow `::selection`, and
   pencil-dashed prose rules.

## Known remaining gaps

- Convex-backed `talks/` and `admin/` components still can't be storied
  (provider + dep-optimizer issues — todo #18).
- Organisms (LayoutWrapper, Footer, CyberHero) have no stories; they depend on
  Next.js router/site metadata and are lower value per effort.
- Chromatic visual regression is installed but not run per theme; running the
  suite once per theme class would lock the paper/terminal parity in CI.
