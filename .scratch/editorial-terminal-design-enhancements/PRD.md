# PRD: Editorial & Terminal Design Enhancements for ryankelly.dev

## Background & Evaluation Context

A visual and structural evaluation of two exemplary technical websites:
1. **[Matthew Phillips](https://matthewphillips.info/programming/posts/ai-writing-is-fine/)** — Editorial brutalism with intense terminal motifs (marquee ticker, blinking cursor, massive clamp typography, 4-column metadata grid, inverted hover states, colossal footer).
2. **[Build Distributed Systems](https://builddistributedsystem.com/projects/mini-kafka)** — High-density technical learning architecture (multi-part series track cards, brutalist progress bars, interactive task list rows with hard offset shadows, and clean monospace SVG architecture diagrams).

Both sites share deep visual alignment with the **`ryankelly.dev`** and **`@rtkelly13/design-system`** philosophy: hard edges, zero border-radius, offset shadows without blur, high contrast, and monospace/condensed typography.

## Goals

1. **Elevate Editorial Punch**: Bring impactful typographic scale (`clamp(...)` display headers with `< 0.9` leading, colossal footer signoffs) and high-density metadata grids to longform blog posts and talks.
2. **Terminal Atmosphere**: Introduce a persistent `TickerTape` marquee and `BlinkCursor` utility to reinforce the living CRT / terminal aesthetic.
3. **Structured Technical Curricula**: Provide a `SeriesTrackCard` component for multi-part technical deep-dives (e.g., Parquet serialization, distributed consensus, .NET architecture) with tactile progress bars and interactive item rows.
4. **First-Class Architectural Diagramming**: Establish standards and SVG templates for high-contrast monospace technical diagrams that adhere to design system invariants.

## Non-Goals & Brand Invariants

- **No Rounded Corners**: Never introduce `border-radius` or `rx > 0`, even if upstream references use them. Everything remains strictly rectangular.
- **No Soft Gradients or Pastels**: Never drift into generic SaaS pastel fades or multi-stop gradients. Surfaces are solid `surface-base` / `surface-raised`, and accents are high-chroma solid fills.
- **Dual-Mode Parity**: Every component must look intentional in both **Midnight** (neon on blue-black `#0a0a1a`) and **Sketch** (graphite ink on warm paper `#f5f3ec`). Colors must be addressed strictly by role (`bg-surface-raised`, `border-border-strong`, `text-accent-primary`), never hardcoded hues.
- **No Native Emoji as UI**: Use Lucide icons or ASCII/terminal glyphs tinted with design system tokens.

## Proposed Issues Breakdown

1. [**01-ticker-tape.md**](issues/01-ticker-tape.md) — Terminal Marquee `TickerTape` Component (dynamic velocity normalization, sticky viewport mode, trailing `endAddon` slot).
2. [**02-article-metadata-grid.md**](issues/02-article-metadata-grid.md) — 4-Column Structured Article Metadata Grid.
3. [**03-series-track-card.md**](issues/03-series-track-card.md) — Multi-Part `SeriesTrackCard` & Interactive Task Rows.
4. [**04-author-endnote-colophon.md**](issues/04-author-endnote-colophon.md) — Editorial Author Endnote Colophon Card.
5. [**05-editorial-typography-and-colossal-footer.md**](issues/05-editorial-typography-and-colossal-footer.md) — Editorial Typography Scale & Calibrated Footer Signature.
6. [**06-monospace-architecture-diagrams.md**](issues/06-monospace-architecture-diagrams.md) — Monospace Vector SVG Architecture Diagram Component & Conventions.
7. [**07-terminal-telemetry-gauge.md**](issues/07-terminal-telemetry-gauge.md) — Monospace ASCII Gauge & Terminal Telemetry Primitives (harmonized with `design-system` branch `217-adopt-chart-primitives`).
8. [**08-ticker-tape-physics-and-position-continuity.md**](issues/08-ticker-tape-physics-and-position-continuity.md) — TickerTape Physics Engine, Position Continuity & Chromium Timeline Reset Bug Investigation.

