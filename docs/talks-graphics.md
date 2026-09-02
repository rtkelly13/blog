# Talk decks, generated graphics & backgrounds

Everything added while archiving four pre-blog slides.com decks and turning the
talk decks into a themeable system: the recreated talks, the slide-rendering
improvements, a standardised SVG **graphics generator** mechanism, **named
per-slide backgrounds**, the experiments gallery, and the accessibility pass.

Shipped across three PRs: **#60** (archived talks, merged), **#61** (slide
sizing), **#62** (graphics + backgrounds).

---

## 1. The recreated talks

Four pre-blog decks from [slides.com/ryankelly](https://slides.com/ryankelly)
were recreated in the talks MDX format under `data/talks/`, emulating the
general arc of each original (not slide-for-slide). Each preserves its original
publish date in frontmatter and carries a signature accent for differentiation:

| Talk | File | Original date | Accent |
| --- | --- | --- | --- |
| Railway Oriented Programming | `railway-oriented-programming.mdx` | 2018-04-13 | magenta `#ec4899` |
| Paket and its Perks | `paket-and-its-perks.mdx` | 2018-07-13 | amber `#facc15` |
| The SAFE Stack | `the-safe-stack.mdx` | 2019-01-24 | cyan `#22d3ee` |
| Map/Reduce with AWS Batch | `aws-batch-mapreduce.mdx` | 2022-09-10 | terminal green `#39ff14` |

Code samples are real F#/C# fences (Prism-highlighted) and diagrams are mermaid,
so the talks are self-contained (no external image assets). They ship
`draft: true` — visible behind a DRAFT badge, admin-only — pending review of the
placeholder `event` names, which are honest topic-based stand-ins because the
original venues are unknown.

The original decks are preserved verbatim too — see [Provenance](#6-provenance--archive).

## 2. Slide rendering

Two presentation fixes in `components/talks/SlideBody.tsx` and `SpectacleDeck.tsx`:

- **Sizing & fill (#61):** slide bodies rendered top-aligned in a `prose-lg`
  box, so sparse slides clustered content in the top third. `SlideBody` now
  fills the slide height, vertically centres its content, and steps the base
  type to `prose-xl`. Verified across every deck — the densest slide is 604/768px,
  so nothing clips.
- **Transitions:** when a talk has a background, the deck uses Spectacle's
  `fadeTransition` so content **dissolves** over the stationary backdrop instead
  of swiping — one consistent motion. Decks without a background keep the default
  swipe.

## 3. Graphics generator mechanism

`components/graphics/` — a standardised, framework-agnostic way to produce
deterministic SVG graphics. A generator is a pure function
**`(params) => svgString`**; the same seed + params always yield identical
output (SSR-safe, snapshotable, shareable by a seed number).

```
components/graphics/
├── rng.ts          # mulberry32 seeded PRNG + range/pick helpers
├── types.ts        # GraphicParams contract + BASE_PARAMS defaults
├── palette.ts      # brutalist accent swatches (mirror tailwind) + withAlpha
├── generators.ts   # the six render functions
├── registry.ts     # named registry, renderGraphic, graphicDataUri, resolveParams
├── GeneratedBackground.tsx  # React wrapper for inline / full-bleed use
└── index.ts        # barrel
```

**`GraphicParams`:** `width`, `height`, `seed`, `accent`, `background`,
`density` (0..1, how busy), `opacity` (0..1, whole-graphic), `strokeWidth`.

**The six generators:** `dot-grid`, `diagonal-hatch`, `node-network`, `contour`,
`iso-grid`, `scatter-blocks`. Each draws its marks at full strength; subtlety for
backgrounds comes from the `opacity` param, so the gallery shows them boldly
while talks dial them down.

**Public API (`registry.ts`):**

- `renderGraphic(name, overrides?) => string` — raw SVG.
- `graphicDataUri(name, overrides?) => string` — `data:image/svg+xml,…` for a CSS
  `url(...)` background.
- `resolveParams(name, overrides?)` — merges defaults; **drops `undefined`
  overrides** so an omitted prop falls back to its default instead of clobbering it.
- `GENERATOR_LIST`, `getGenerator(name)`.

Render inline anywhere:

```tsx
<GeneratedBackground generator="contour" accent="#39ff14" opacity={0.3} />
```

## 4. Talk backgrounds (named, decoupled, per-slide)

Backgrounds are defined **once**, **named**, and referenced by name, so slides
can share a backdrop or switch between several. The backdrop only transitions
when the active slide's background name actually changes — otherwise it stays
fixed while the content moves.

**Frontmatter** (`data/talks/*.mdx`):

```yaml
backgrounds:
  main:
    generator: dot-grid
    seed: 7
    accent: '#22d3ee'
    density: 0.4
    opacity: 0.28
  activity:
    generator: scatter-blocks
    seed: 3
    accent: '#facc15'
    opacity: 0.24
background: main        # deck-wide default background name
```

**Per-slide override** — a directive anywhere in a slide's body (it's an MDX
comment, so it renders nothing and is stripped at compile):

```mdx
{/* bg: activity */}

# Try it: making toast
```

**How it works:**

- `lib/talks.ts` parses the `{/* bg: name */}` directive per slide → `slide.background`.
- `SpectacleDeck` renders one fixed `DeckBackground` layer per named background,
  each shown via `opacity` (1 for the active slide's background, 0 otherwise) with
  a 500 ms CSS fade. Slides that share a name never change that layer's opacity, so
  the backdrop is genuinely fixed between them; a name change cross-fades.
- When any background exists, slides and the deck's own backdrop go transparent so
  the fixed layer shows through, and content uses `fadeTransition` (§2).
- The active slide is reported from inside Spectacle's persistent template via
  `ActiveSlideReporter`, so tracking works in every mode (attendee/presenter/console).

`So You Want To Build Software?` (`so-you-want-to-build-software.mdx`) is the
worked example: `main` dot-grid throughout, switching to the `activity` scatter
backdrop on its two hands-on slides.

## 5. Experiments gallery

`/experiments/graphics` (`pages/experiments/graphics.tsx`, linked from the
experiments index) is a live gallery of all six generators with **accent /
seed-shuffle / density / opacity** controls (defaults: density 0.5, opacity 0.5).
Each card's **Config** button copies a ready-to-paste `backgrounds:` frontmatter
block reflecting the current controls, and the page documents the per-slide
directive.

## 6. Provenance & archive

- **Static export:** the four original slides.com decks were captured to PNGs via
  the `agent-browser` CDP workflow (reveal.js `/fullscreen` view, driven over CDP
  on port 9223) — full-slide screenshots plus each deck's original embedded image
  assets. Reusable capture script lives at `temp/capture-deck.sh` (gitignored).
- **Archive:** that export (54 files, ~55 MB) is copied to personal Google Drive
  at `My Drive/Archive/slides.com Talks Archive/` (with a provenance README), via
  the local Google Drive for Desktop folder. Convex/site are not the long-term
  store.

## 7. Accessibility

Ran **axe-core** (`color-contrast`) against five text-heavy slides of the
software-engineering talk (with a background) on the deployed preview:

- **Zero violations.** The only flags are "needs review", all from Spectacle's
  own slide pseudo-element — an A/B test (background image on vs. off) returned an
  **identical** count, so the generated background contributes nothing to the
  contrast picture.
- Worst-case math confirms it: the brightest possible dot (accent at effective
  ~0.11 alpha over black) leaves white body text at ~18:1 contrast, far above AA
  (4.5:1) and AAA (7:1).

Backgrounds are safe to keep at the opacities in use.

---

## Authoring recipes

**Add a background to a talk:** open `/experiments/backgrounds`, tune the controls,
copy a card's Config block into the talk's frontmatter. For multiple backdrops,
add more named entries and switch per slide with `{/* bg: name */}`. Keep opacity
low (~0.12–0.3) behind text-heavy slides.

**Add a new generator:**

1. Write a pure `RenderFn` in `components/graphics/generators.ts` (use the seeded
   `rng` helpers; draw marks at full strength, let `opacity` handle subtlety) and
   add it to the `GENERATORS` map.
2. Add a label/description/defaults entry in `registry.ts`'s `META`.
3. It appears in the gallery and is usable by name in any talk automatically.
