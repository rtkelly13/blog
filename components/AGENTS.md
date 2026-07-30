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
├── talks/            # Talk deck + embeddable live widgets (Convex-backed)
├── admin/            # Presenter/admin hub UI (behind AdminGate)
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
- `talks/index.ts` → BreakTimer, EmojiTop5, LivePoll, OrderedActions, QuestionQueue, TalkCard, TalkTimer
  (**not** SpectacleDeck — see barrel note below)
- `admin/index.ts` → AdminGate, AudienceControls, SessionManager, TalkControls

## KEY COMPONENTS

| Component           | Purpose                   | Props/Notes                           |
| ------------------- | ------------------------- | ------------------------------------- |
| `MDXComponents.tsx` | Maps MDX elements → React | Used by `getMDXComponent()`           |
| `MDXLayoutRenderer` | Renders MDX with layout   | `{layout, mdxSource, ...frontMatter}` |
| `LayoutWrapper`     | Site wrapper              | Header, footer, sticky nav            |
| `BlogActions`       | Post floating actions     | TOC popover, scroll buttons           |
| `References`        | LaTeX-style bibliography  | `{references, backlinks?, label?}` — original + archived link per entry (see lib/AGENTS.md → remark-references) |
| `SeriesNavigation`  | Multi-part post nav       | Prev/next within series               |
| `Button`            | Brutalist button          | `variant`, `size`, `shadow` props     |
| `Card`              | Content card              | Brutalist borders, hard shadows       |
| `PageHeader`        | Listing/index page header | `{title, subtitle?, icon?, accent?}` — the one header primitive for index pages (see below) |
| `PageTitle`         | Detail page title         | Bracketed double-border `<h1>` for post/series/idea **detail** pages |

## PAGE HEADERS

Index/listing pages (`/blog`, `/talks`, `/projects`, `/tags`, `/ideas`,
`/design-sandbox`) share **one** header via `PageHeader` — a `bg-zinc-900`
block with an optional lucide `icon`, a bracketed `[ TITLE ]`, and a `>`-prompt
mono `subtitle`. Drop it in as the first child of the standard page shell:

```tsx
<div className="divide-y divide-white border-2 border-white bg-black">
  <PageHeader title="TALKS" icon={Presentation} accent="pink" subtitle="…" />
  {/* page content */}
</div>
```

- **`accent` is the per-section colour rule, in one place** — `cyan` (default,
  blog/projects/sandbox), `pink` (talks — matches its card borders), `yellow`
  (ideas). It themes the icon + prompt glyph through the `--brutalist-*` tokens.
- **Icons are lucide only — no emoji.** Native emoji break the ASCII/brutalist
  aesthetic (they render as full-colour OS glyphs).
- Detail pages use `PageTitle` (bordered bracket text), not `PageHeader`. Blog
  listing uses `ListLayoutWithTags`, which owns its own centred header.

## DUAL-MODE THEMING (non-negotiable)

The design system is **two first-class aesthetics driven by one token set**:
the default **neon-terminal dark** mode (`dark`/`dim` — neon accents on black)
and the **sketch** mode (paper-and-ink light, blue/red/green accents). They are
not "a theme and its override" — every surface must read as intentional in
both.

This works because `.sketch` (and `.dim`) **remap the colour tokens
themselves** in `css/tailwind.css` — `--color-black`, `--color-white`, the
`--color-zinc-*` scale, and the `--brutalist-*` accents all flip to paper/ink
values. So the rule for any new component is:

- **Build only on the remapped tokens**: `bg-black` / `bg-zinc-900`,
  `border-white`, `text-white`, `text-zinc-400`, `text-brutalist-cyan|pink|
  yellow`, `shadow-hard-*`. These invert automatically — write the dark look
  and sketch comes for free.
- **Never hardcode** `text-gray-900`, `dark:*` pairs, or hex literals for
  surfaces/text/borders — the grey scale and literals don't remap, so they
  break sketch mode (this was exactly why the old `/tags` page was unreadable
  on paper).
- **No emoji as UI** — native emoji render as fixed full-colour OS glyphs that
  ignore both themes; use lucide icons tinted with a `text-brutalist-*` accent
  so they follow dark ↔ sketch.
- Verify both: cycle the theme switch (HIGH → DIM → SKETCH) and confirm the
  component reads on paper as well as on black.

## INTERACTIVE MDX (interactive/)

Step-driven interactives usable in any MDX (posts, talks, ideas):

- `IdeaDeck` + `IdeaSlide` — embedded mini slide show (Motion transitions,
  arrow keys, square dots). Slides are `<IdeaSlide title="...">` children.
- `Walkthrough` — guided node-graph tour (@xyflow/react): each step highlights
  `focus` nodes, lights `activeEdges` ("from->to"), and pans the camera. No
  free pan/zoom, so it never hijacks page scroll.
- `Terminal` — scriptable fake terminal session: `script` is a sequence of
  `{cmd}` (typewriter), `{out}` (streamed/instant lines, optional
  `highlight` that scrolls to centre and dims the rest), `{pause}`, `{clear}`.
  Tail-follows output like a real terminal (manual scroll-up pauses
  following), inline colours via `{{cyan|…}}`-style markup, autoplay on view
  (or a run button), loop, replay/skip controls.
- `QueryRouter` — query-routing simulator: a typed-in query scans the
  AGENTS.md where-to-look table (skeleton rows resolve to a highlighted
  match), the route breadcrumb draws, context blocks load one after another,
  and the answer lands. Two block styles: default streams lines behind
  skeleton loaders; `terminal: true` renders an emulated terminal window that
  scrolls down the command's full fake output and highlights the one relevant
  line (`highlight: <substring|index>`) while the rest dims. Scenarios are
  declarative props.
- `FileTree` — animated filesystem view of the virtual monorepo: a "wire the
  symlink" toggle mirrors the body repos into the brain's `projects/`, and a
  git-view / agent-view toggle shows the same subtree ignored-by-git vs
  traversable-by-agent (the two-ignore-files trick). Trust-tier dots
  (brain/trusted/untrusted). Pure model + rules in `fileTreeModel.ts`
  (unit-tested); no props needed — the workspace layout is baked in.
- `MapReduceViz` — animated AWS-Batch-style pipeline: colour-coded job types
  (PREPARE cyan → MAP array pink → REDUCE yellow; spot-reclaim orange) flow
  from a JOB_QUEUE through a slot-limited COMPUTE_ENV into a SUCCEEDED stack,
  with dependencies (maps wait on prepare, reduce waits on all maps), visible
  queuing when maps outnumber slots, and one map losing its spot instance and
  re-queueing. Deterministic seeded discrete-event scheduler in
  `mapReduceModel.ts` (`buildRun` → pure `stateAt(plan, t)`, unit-tested);
  rAF clock, autoplay-on-view, fan-out presets (x4/x8/x12), replay. Reduced
  motion swaps the clock for a PREPARE/MAP/REDUCE/DONE phase stepper. Props:
  `mappers`, `slots`, `spotReclaim`, `caption`, `title`, `autoplay`.
- `MigrationRatioChart` — stacked bar chart of legacy vs modern project counts
  per year, on **TanStack Charts** (the repo's only charting library; see CHARTS
  below). Bars grow from the baseline staggered by year on autoplay-on-view;
  headline tiles quote the final legacy:modern ratio. Stacking, the reveal and
  the cleaning of bad rows live in `migrationRatioModel.ts` (`buildMigrationPlan`
  → pure `stateAt(plan, progress)`, unit-tested) — same split as
  `MapReduceViz`. Reduced motion lands on the finished chart; it's a single
  reveal, so there's no stepper. `rows={[]}` renders nothing at all. Props:
  `rows`, `title`, `caption`, `legacyLabel`, `modernLabel`, `yLabel`,
  `legendLabel`, `duration`, `height`, `autoplay`.

Both are registered in `MDXComponents.tsx` via `next/dynamic` (`ssr: false`) so
motion/@xyflow/react ship as lazy chunks only on pages that mount them.
`IdeaSlide` is the exception — a dependency-free static marker component.
Both respect `prefers-reduced-motion` via `useReducedMotion`.

## CHARTS (TanStack Charts)

`@tanstack/charts` + `@tanstack/react-charts` are the only charting library in
the repo. Adopted as a **spike**, blog-only — deliberately *not* added to
`@rtkelly13/design-system`, because both packages are still version `0.0.0` and a
published design system should not hand that churn to its consumers. Promote the
layer into the DS once TanStack cuts a real version.

`/design-sandbox/charts` is the canary page: exercise it (and cycle HIGH → DIM →
SKETCH) after any upgrade.

**Theming is a single CSS block, not per-component code.** The library's default
theme is `currentColor` for text/grid/axes plus six `var(--ts-chart-N)`
categorical series, so the whole integration is the palette bridge in
`css/tailwind.css` pointing `--ts-chart-1..6` at the brutalist accents. One
`:root` block covers all three themes, because next-themes puts the theme class
on `<html>` — the same element as `:root` — so `--brutalist-*` is already
remapped when these `var()`s resolve. **Do not restate the bridge per theme.**
Series 5-6 are literals: the remaining brutalist aliases collapse onto
cyan/pink/yellow under sketch, which would make two series identical on paper.

Read the theme's palette from the build context (`({ input, theme }) => …`,
`theme.palette[n]`) rather than restating colours in a component — that's how
`MigrationRatioChart` colours both its bars and its legend.

Sharp edges, all found the hard way — every one fails **silently**, not loudly:

- **`barY`/`barX` have no `stroke` option at all** (only `fill`, `fillOpacity`,
  `radius`). Brutalist bars need a 2px border, so stacked/bordered bars must use
  `rect`, which does support `stroke`/`strokeWidth`.
- **`rect`'s `y1`/`y2` are channel-only**, unlike `barY.y1` which accepts a
  constant. `y1: 0` is read as a field lookup, drops every row, and renders an
  empty chart with no error. Use `y1: () => 0` or a real field.
- **A band scale's domain must match the field's runtime type.** `year` as a
  number against `scaleBand().domain(years.map(String))` maps every bar to
  `x="NaN"`. Keep the domain numeric for numeric fields.
- Stacking, binning and grouping are **the application's job** — the library
  leaves data preparation alone. Put them in a pure model beside the component
  (`migrationRatioModel.ts`) and unit-test it, per the house pattern.
- Both positional scales are **required**; a missing one throws rather than
  silently defaulting.

TypeScript catches the first two if you let inference work — don't reach for
casts or adapter generics. Use the curried `defineChart<Input>()(builder)` form
for dynamic definitions; supplying one type argument to the direct form fails to
infer.

Cost: the whole chart — core, React adapter, `d3-scale`, `d3-array`, model and
component — is ~13.7 kB gzip in one lazy chunk, and nothing references it from a
page entry chunk, so pages without a chart pay nothing.

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

## TALKS

The live-talk UI, backed by Convex (see convex/AGENTS.md). Split into the deck
itself and the embeddable audience widgets. Deck theming, the SVG **graphics
generators** (`components/graphics/`), and **named per-slide backgrounds** are
documented in [docs/talks-graphics.md](../docs/talks-graphics.md).

| Component          | Purpose                                                       |
| ------------------ | ------------------------------------------------------------ |
| `SpectacleDeck`    | Spectacle-based slide deck (client-only; imported via `next/dynamic`) |
| `SlideBody`        | Renders one compiled MDX slide (`getMDXComponent`)           |
| `theme.ts`         | `brutalistTheme` — Spectacle theme matching the design system |
| `TalkCard`         | Talk listing card                                            |
| `TalkTimer`        | Pacing countdown (`react-timer-hook`)                        |
| `ResolvedRoom`     | Shared shell: guards Convex-unconfigured, resolves the room (explicit prop or current live talk), hands it to children |
| `DeckModeContext`  | `useDeckMode()` — attendee / presenter / console mode        |
| `DeckLive`         | `DeckDriver` + `Follower` — follow-the-presenter broadcast/mirror (named exports) |
| `DeckSidebars`     | `AttendeeSidebar` + `ConsoleSidebar` — deck side panels (named exports) |
| `BreakTimer`       | Shared break countdown widget (+ `BreakControl` console panel) |
| `EmojiTop5`        | Live reaction leaderboard widget                            |
| `LivePoll`         | Word-cloud poll widget                                      |
| `OrderedActions`   | "Put the actions in order" activity widget                  |
| `QuestionQueue`    | Audience Q&A queue widget                                   |

The embeddable widgets (BreakTimer, EmojiTop5, LivePoll, OrderedActions,
QuestionQueue) are usable in MDX slides and on `/live`; each wraps its body in
`ResolvedRoom`.

## ADMIN

Presenter/admin hub UI, rendered on `/admin` behind `AdminGate`.

| Component          | Purpose                                                       |
| ------------------ | ------------------------------------------------------------ |
| `AdminGate`        | GitHub sign-in gate — renders children only for an allowed admin |
| `TalkControls`     | Start/end a talk, pick a config preset + toggles             |
| `AudienceControls` | Presenter moderation: Q&A, poll, activity controls           |
| `SessionManager`   | Past/live session log with per-session data + clear-down     |
| `useRunAction`     | Hook wrapping a Convex mutation call with pending/error state |

## CONVENTIONS

- PascalCase filenames
- Default exports for components
- Props interfaces inline or in types.ts
- Barrel exports via index.ts in feature folders
- Stories colocated (e.g., `Button.stories.tsx`)

### Exceptions & notes

- **(#16) Export convention exception:** `DeckLive.tsx` (DeckDriver + Follower) and
  `DeckSidebars.tsx` (AttendeeSidebar + ConsoleSidebar) intentionally use *named*
  exports because each is a tightly-coupled pair of components in one module — the
  "default export per component" rule assumes one component per file.
- **(#17) Barrel exclusion:** `SpectacleDeck` is intentionally **not** re-exported
  from `talks/index.ts` — `present.tsx` imports it via `next/dynamic` for
  code-splitting, and routing it through the barrel would pull the heavy Spectacle
  dependency into every consumer of the module.

## STORYBOOK

Components with `.stories.tsx` are documented in Storybook:

- `Button.stories.tsx` - CSF 3.0 with autodocs
- `stories/*.stories.tsx` - Design sandbox examples

Run: `pnpm storybook`

- **(#18) Talk components aren't storied (yet):** the talk/admin components are hard
  to story in the Storybook browser-test env — they depend on a Convex provider,
  `react-timer-hook` fails the dep-optimizer, and the `Link`→`data/siteMetadata`
  CJS interop breaks the import. Stories are deferred pending Storybook infra (a
  Convex decorator + a CJS interop fix).
