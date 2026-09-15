# Editorial & Terminal Design Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all proposed editorial and terminal design enhancements as production-ready React components with full Storybook coverage across Midnight and Sketch themes, on a dedicated feature branch with a comprehensive PR.

**Architecture:** Monospace-first brutalist components adhering to zero-border-radius (`rounded-none`, `rx="0"`), dual-mode theme parity (Midnight CRT neon and Sketch graphite/warm paper), continuous RAF virtual transforms for marquees, and role-based semantic design tokens.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Storybook 10.5, TypeScript 5.8+, Lucide React.

**Spec:** `/Users/ryankelly/code/personal/blog/.scratch/editorial-terminal-design-enhancements/PRD.md` and `/Users/ryankelly/code/personal/blog/.scratch/editorial-terminal-design-enhancements/issues/01-08`

## Global Constraints

- **Zero Border Radius**: Invariant across all components (`0px`, `rounded-none`, `rx="0"`).
- **Role-Based Tokens**: No hardcoded color hues (no `#cyan`, `#yellow`); strictly use CSS semantic variables and theme ladder tokens (`bg-surface-raised`, `border-border-strong`, `text-accent-primary`, `text-intent-success`).
- **Dual-Mode Parity**: Every component must look intentional in both **Midnight** (`data-theme="midnight"`) and **Sketch** (`data-theme="sketch"`).
- **Continuous RAF Velocity**: `TickerTape` must not use CSS `@keyframes` with `playbackRate` manipulation; it must use virtual RAF transform calculations to avoid Chromium timeline reset bugs.
- **Storybook First**: Every component must have a `.stories.tsx` file exporting default args, variant states, and both theme configurations.

---

### Task 1: Branch Setup & Test Baseline

**Files:**
- Modify: git branch state (`git checkout -b feat/editorial-terminal-enhancements`)

- [ ] **Step 1: Create feature branch**
  Run: `git -C /Users/ryankelly/code/personal/blog checkout -b feat/editorial-terminal-enhancements`

- [ ] **Step 2: Verify baseline build and Storybook build**
  Run: `pnpm build-storybook` or `pnpm typecheck` in `/Users/ryankelly/code/personal/blog`
  Expected: Clean pass with zero errors.

---

### Task 2: Monospace ASCII Gauge & Terminal Telemetry HUD (Issue 07)

**Files:**
- Create: `components/AsciiGauge.tsx`
- Create: `components/hud/TelemetryGauge.tsx`
- Create: `stories/AsciiGauge.stories.tsx`
- Create: `stories/TelemetryGauge.stories.tsx`
- Test: `tests/AsciiGauge.test.tsx`

**Interfaces:**
- Produces: `<AsciiGauge value={...} target={...} variant="block|shade|line|ascii|braille" />`
- Produces: `<TelemetryGauge state="cruise|braking|halted|spooling" value={...} metricLabel="..." />`

- [ ] **Step 1: Implement `<AsciiGauge />`**
  Zero-dependency monospace progress meter supporting:
  - Glyphs: `block` (`█`, `░`), `shade` (`▓`, `▒`, `░`), `line` (`=`, `-`), `ascii` (`#`, `-`), `braille` (`⣿`, `⠀`).
  - Target benchmark marker pin (`|` or `▲`).
  - Strict monospace font family and accessible `role="meter"` attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`).

- [ ] **Step 2: Implement `<TelemetryGauge />`**
  Composite instrument HUD with status badge pill (`CRUISE`, `BRAKING`, `HALTED`, `SPOOLING`), numeric percentage readout, and embedded `<AsciiGauge />`.

- [ ] **Step 3: Write Storybook stories**
  Cover all variants (`block`, `shade`, `line`, `ascii`, `braille`), target pin benchmarks, machine states, and dark/light theme switching.

- [ ] **Step 4: Verify typecheck & Storybook**
  Run: `pnpm typecheck`

---

### Task 3: Continuous-Physics Ticker Tape with Eased Hover & Trailing Slot (Issues 01 & 08)

**Files:**
- Create: `components/TickerTape.tsx`
- Create: `stories/TickerTape.stories.tsx`

**Interfaces:**
- Consumes: `<TelemetryGauge />` (for docked HUD slot)
- Produces: `<TickerTape items={string[]} pixelsPerSecond={52} sticky={boolean} endAddon={ReactNode} />`

- [ ] **Step 1: Implement `<TickerTape />`**
  - Seamless duplicate text loop (`2x` items).
  - Virtual RAF transform engine with dynamic delta-time: `scrollPos += velocity * dt`.
  - Symmetric eased deceleration (`targetRate = 0` on hover) and spool-up (`targetRate = 1` on leave) with cubic easing curves.
  - Sticky viewport docking (`sticky` prop) with top-0 fixed elevation and 2px border.
  - Trailing slot (`endAddon`) with sticky right positioning, high z-index, and solid background.

- [ ] **Step 2: Write Storybook stories**
  Stories:
  - `DefaultCruise`: Standard rolling marquee at 52px/s.
  - `WithDockedTelemetryHUD`: Ticker with live `<TelemetryGauge />` reacting to hover deceleration in real time.
  - `WithSubscribeAction`: Ticker with docked call-to-action button and blinking cursor.
  - `StickyMode`: Ticker pinned to top of viewport.
  - `SketchTheme`: Warm paper and graphite ink drafting ruler aesthetic.

- [ ] **Step 3: Verify typecheck**
  Run: `pnpm typecheck`

---

### Task 4: Article Metadata Grid (Issue 02)

**Files:**
- Create: `components/ArticleMetadataGrid.tsx`
- Create: `stories/ArticleMetadataGrid.stories.tsx`

**Interfaces:**
- Produces: `<ArticleMetadataGrid published="..." readTime="..." series="..." tags={string[]} />`

- [ ] **Step 1: Implement `<ArticleMetadataGrid />`**
  - 4-column responsive grid (`grid-cols-2 md:grid-cols-4`).
  - Brutalist hard vertical cell dividers (`border-r-2 border-border-strong`).
  - Monospace uppercase column labels with bracket tags (`[PUBLISHED]`, `[READ TIME]`, `[SERIES]`, `[TAGS]`).
  - Hover background highlights with inverted ink contrast.

- [ ] **Step 2: Write Storybook stories**
  Stories:
  - `StandardArticle`: Complete 4-column metadata set.
  - `WithoutSeries`: 3-column fallback for standalone essays.
  - `MidnightAndSketch`: Both theme ladder variations.

---

### Task 5: Multi-Part Series Track Card & Task List (Issue 03)

**Files:**
- Create: `components/SeriesTrackCard.tsx`
- Create: `stories/SeriesTrackCard.stories.tsx`

**Interfaces:**
- Produces: `<SeriesTrackCard trackNumber="01" title="..." description="..." progress={60} items={TrackItem[]} />`

- [ ] **Step 1: Implement `<SeriesTrackCard />`**
  - Track card container with 2px hard border and offset drop shadow (`shadow-[4px_4px_0px_var(--border-strong)]`).
  - Header with terminal track badge (`TRACK 01 // DISTRIBUTED ARCHITECTURE`).
  - Brutalist segmented progress bar with monospace percentage readout.
  - Interactive item rows with index numerals (`01`, `02`, `03`), status badges (`COMPLETED`, `CURRENT`, `LOCKED`), and hover elevation offset (`translate(-2px, -2px)`).

- [ ] **Step 2: Write Storybook stories**
  Stories:
  - `ParquetSerializationTrack`: In-progress 5-part curriculum track.
  - `CompletedTrack`: 100% completed track.
  - `InteractiveState`: Hover and click inspection.

---

### Task 6: Author Endnote Colophon Card (Issue 04)

**Files:**
- Create: `components/AuthorColophon.tsx`
- Create: `stories/AuthorColophon.stories.tsx`

**Interfaces:**
- Produces: `<AuthorColophon authorName="Ryan Kelly" role="..." sectionSymbol="§" bio="..." links={ColophonLink[]} />`

- [ ] **Step 1: Implement `<AuthorColophon />`**
  - Editorial card with prominent typographic section symbol (`§` / `0x00A7`).
  - Monospace author identity block and bio text.
  - Brutalist button chips with inverted-hover fills and zero border-radius.

- [ ] **Step 2: Write Storybook stories**
  Stories:
  - `StandardColophon`: Blog post conclusion bio and links.
  - `TalkColophon`: Speaker bio with slides and video links.

---

### Task 7: Monospace Vector SVG Architecture Diagrams (Issue 06)

**Files:**
- Create: `components/diagrams/ArchitectureDiagram.tsx`
- Create: `stories/ArchitectureDiagram.stories.tsx`

**Interfaces:**
- Produces: `<ArchitectureDiagram title="..." nodes={DiagramNode[]} edges={DiagramEdge[]} legend={...} />`

- [ ] **Step 1: Implement `<ArchitectureDiagram />`**
  - Clean SVG canvas with strict `rx="0"`, 2px strokes (`var(--border-strong)`), and monospace node labels.
  - Node role styling: `leader` / `primary` (accent highlight fill), `follower` / `surface` (neutral fill).
  - Orthogonal connector lines with directional arrowheads.
  - Monospace embedded legend and title bar.

- [ ] **Step 2: Write Storybook stories**
  Stories:
  - `MiniKafkaPipeline`: Cluster producer, partition broker, consumer group topology.
  - `ParquetEncoderArchitecture`: Columnar chunk encoding flow.

---

### Task 8: Calibrated Editorial Typography & Colossal Footer (Issue 05)

**Files:**
- Create: `components/ColossalFooter.tsx`
- Create: `stories/ColossalFooter.stories.tsx`
- Create: `stories/EditorialTypography.stories.tsx`

**Interfaces:**
- Produces: `<ColossalFooter brand="RYAN KELLY" signoff="..." navLinks={...} />`

- [ ] **Step 1: Implement `<ColossalFooter />`**
  - Calibrated responsive display scale (`clamp(1.5rem, 3.8vw, 3.25rem)`), keeping it impactful without overwhelming navigation.
  - Monospace prompt icon (`>_`), blinking cursor, and copyright colophon.
  - Category navigation columns and social action chips.

- [ ] **Step 2: Implement Editorial Typography Story**
  Specimen page demonstrating the calibrated header hierarchy (`clamp(2.75rem, 6.5vw, 5.5rem)`), dense letter-spacing (`-0.03em`), and tight leading (`leading-[0.88]`).

---

### Task 9: Comprehensive Showcase Story & Storybook Launch

**Files:**
- Create: `stories/EditorialTerminalShowcase.stories.tsx`

- [ ] **Step 1: Build Integrated Showcase Story**
  Assemble a complete article page using all newly created components:
  - Top `TickerTape` with docked `TelemetryGauge`
  - Calibrated display title and `ArticleMetadataGrid`
  - Inline `ArchitectureDiagram`
  - Embedded `SeriesTrackCard`
  - `AuthorColophon`
  - `ColossalFooter`
  - Controls to switch between **Midnight** and **Sketch** themes dynamically.

- [ ] **Step 2: Run Full Quality Gate**
  Run: `pnpm typecheck`
  Run: `pnpm build-storybook`

- [ ] **Step 3: Launch Storybook for User Evaluation**
  Run `pnpm storybook` on port 6006 and open in Google Chrome.

---

### Task 10: Git Commit, PR Generation & Issue Status Updates

**Files:**
- Git commits across feature branch `feat/editorial-terminal-enhancements`
- Update: `.scratch/editorial-terminal-design-enhancements/issues/*.md` (`Status: in-review`)

- [ ] **Step 1: Stage and commit all changes**
  Atomic commits conforming to conventional commit standards:
  - `feat(ui): implement AsciiGauge and TelemetryGauge primitives`
  - `feat(ui): implement continuous-physics TickerTape with sticky mode`
  - `feat(ui): implement ArticleMetadataGrid and SeriesTrackCard`
  - `feat(ui): implement AuthorColophon and ArchitectureDiagram`
  - `feat(ui): implement ColossalFooter and editorial typography specimens`
  - `feat(storybook): add comprehensive EditorialTerminalShowcase story`

- [ ] **Step 2: Prepare PR documentation**
  Draft the pull request description with full references to issues 01 through 08, architectural decisions, and visual verification notes.
