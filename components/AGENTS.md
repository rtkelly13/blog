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

Both are registered in `MDXComponents.tsx` via `next/dynamic` (`ssr: false`) so
motion/@xyflow/react ship as lazy chunks only on pages that mount them.
`IdeaSlide` is the exception — a dependency-free static marker component.
Both respect `prefers-reduced-motion` via `useReducedMotion`.

## EXPERIMENTS (experiments/)

Self-contained prototypes that live at `/experiments/<name>` and are **not** part
of the site's component vocabulary. The rule for this directory: an experiment
may cost its own route whatever it likes, and every other route nothing.

### neanderbonk/ — automatic referee for Poetry for Neanderthals

Listens through the microphone, counts syllables, and calls the bonk. Six
modules, split so the rules are testable without a browser:

| Module               | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `syllables.ts`       | Lexicon lookup + vowel-group heuristic fallback (pure)      |
| `rules.ts`           | Verdicts: syllable rule, answer rule, strictness (pure)     |
| `words.ts`           | Original starter deck + shuffle (pure)                      |
| `useSpeechReferee.ts`| Web Speech API → settled words, with restart handling        |
| `bonk.ts`            | Web Audio buzzer + haptics                                  |
| `NeanderBonk.tsx`    | The app: round/score state machine and UI                   |
| `RefereeLab.tsx`     | `/experiments/neanderbonk-lab`: the judging pipeline alone — type or speak words, see every ruling (incl. fillers), no game state |

- **`syllables.ts`, `rules.ts` and `words.ts` have no React or DOM imports**, so
  the entire ruling logic is unit-tested on the JVM-equivalent — plain Node —
  in `tests/neanderbonk-{syllables,rules}.test.ts`. The e2e spec
  (`tests/neanderbonk.spec.ts`) stubs `SpeechRecognition` to drive transcripts
  deterministically; headless Chromium cannot really recognise speech.
- **No barrel export, deliberately** — same reasoning as the `SpectacleDeck`
  exclusion (#17). `pages/experiments/neanderbonk.tsx` reaches the app through
  `next/dynamic` with `ssr: false`; routing it through an index would drag it
  into every consumer of the module.
- **The lexicon is a `public/` asset, never an import.**
  `public/neanderbonk/syllables.txt` is 117k words derived from the CMU
  Pronouncing Dictionary (~950 KB), fetched on mount. Regenerate with
  `pnpm neanderbonk:lexicon` — it needs the network and is *not* part of
  `pnpm build`; the output is committed.
- **Three verdicts, not two.** `bonk` for certain violations, `flag` for
  suspected ones, `clean` otherwise. Ambiguous pronunciations ("fire", "hour")
  and out-of-vocabulary words can only ever reach `flag`. This is deliberate: a
  missed violation costs nothing, a false accusation ruins the game. Preserve it.
- **Hold-to-clue is the only mode players see.** Open mic judges the whole room
  as the poet — the false-accusation failure mode — so the mode picker renders
  in development builds only (`OPEN_MIC_AVAILABLE`). The e2e spec drives the
  hold button through its keyboard path (`Space` down/up) instead.
- **The game persists; the round does not.** Scores, log, and whose turn it is
  live in `localStorage` (`neanderbonk:game:v1`) so a refresh keeps the game;
  a live round's clock and transcript deliberately reset. Reset game clears the
  saved state. Restored log ids seed the id counter — don't break that, or keys
  collide.
- **This is the one route allowed the microphone.** `next.config.js` grants
  `microphone=(self)` for `/experiments/neanderbonk` only, via a route rule
  placed *after* the site-wide denial — where two rules set the same header key,
  the later one wins.

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
