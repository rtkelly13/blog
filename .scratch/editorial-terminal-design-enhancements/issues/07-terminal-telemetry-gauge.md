# Issue 07: Monospace ASCII Gauge & Terminal Telemetry Primitives

Status: needs-triage
Labels: `design-system`, `component-contract`, `charts`, `typography`, `terminal`
Cross-References:
- `design-system` branch `217-adopt-chart-primitives` (Commit `9575c03`, `<BulletChart />`, `<BarChart />`, `<Sparkline />`)
- `blog` branch `claude/tanstack-charts-adoption-hhk2jw` (TanStack ratio chart & SVG hatch textures)
- `blog` issue `01-ticker-tape.md` (Trailing `endAddon` slot integration)
- `blog` issue `08-ticker-tape-physics-and-position-continuity.md` (Real-time velocity telemetry feed)

## Summary

Coordinate the terminal instrument HUD with the ongoing chart primitives work in `design-system` (`217-adopt-chart-primitives`). We define a two-tier primitive architecture:
1. **`<AsciiGauge />`**: A foundational, zero-dependency, character-based meter component in `@rtkelly13/design-system` (analogous to `AsciiDivider` and `BracketText`) that renders deterministic monospace progress bars and KPI benchmark targets in pure text.
2. **`<TelemetryGauge />`**: A composite terminal HUD widget (for `blog` and estate dashboards) that binds `<AsciiGauge />` with semantic status pills (`[CRUISE]`, `[BRAKING]`, `[HALTED]`), numeric readouts, and event-stream metrics (such as `TickerTape` velocity).

---

## Architectural Context: Chart & Gauge Taxonomy

On branch `217-adopt-chart-primitives`, `@rtkelly13/design-system` adopted Visx and `@microcharts/react` to provide:
- `<BulletChart />`: SVG-based quantitative target-versus-actual benchmark comparator with comparative range bands (`[40, 70, 100]`).
- `<BarChart />`: Visx categorical horizontal/vertical bar charts with 2px brutalist borders and theme ladder fills.
- `<Sparkline />`: SVG micro-trend indicator.

### The Gap: Textual / Monospace Terminal Parity

While `<BulletChart />` excels at rich graphical dashboard benchmarks, the estate's retro-brutalist and terminal aesthetic relies heavily on **monospace text parity** (e.g. `AsciiDivider`, `BracketText`, `NerdIcon`, terminal prompts).

SVG charts cannot be streamed in raw terminal logs, copied as plain text into issue comments, or embedded cleanly in dense single-line monospace headers like `<TickerTape />` without layout shifts or heavy DOM overhead.

`<AsciiGauge />` provides the pure-text monospace counterpart to `<BulletChart />`:

| Feature | `<BulletChart />` (`217-adopt-chart-primitives`) | `<AsciiGauge />` (Proposed Primitive) |
|---|---|---|
| **Rendering Engine** | SVG via `@microcharts/react` | Pure UTF-8 Monospace text (`span` / `code`) |
| **Primary Use Case** | Dashboard StatCards, table cells, analytical prose | Inline headers, terminal HUDs, CLI logs, TickerTape slots |
| **Benchmark / Target** | Vertical marker line on SVG axis | Pin glyph (`|` or `▲`) at target position |
| **Theme Reaction** | CSS variable fill (`accentVar(accent)`) | CSS text color tokens (`text-accent-primary`, etc.) |
| **Text Streamability** | No (SVG DOM tree) | Yes (100% copy-pasteable text output) |
| **Dependencies** | `@microcharts/react` | Zero external dependencies |

---

## Component Specifications

### 1. Foundational Primitive: `<AsciiGauge />` (`@rtkelly13/design-system`)

Located in `design-system/src/components/AsciiGauge.tsx`.

#### Character Sets (`variant`):
- `block` (default): `█` (filled), `░` (unfilled), `|` (target) &rarr; `[████████░░░░]`
- `shade`: `▓` (dense), `▒` (medium), `░` (empty) &rarr; `[▓▓▓▓▓▓▒▒░░░░]`
- `line`: `=` (filled), `-` (unfilled) &rarr; `[========----]`
- `ascii`: `#` (filled), `-` (unfilled) &rarr; `[########----]`
- `braille`: `⣿` (full), `⣶`, `⣤`, `⣀`, `⠀` &rarr; `[⣿⣿⣿⣶⣀⠀⠀]`

#### Benchmark / Target Marker Support:
When `target` is specified (e.g. `value={65}`, `target={80}`), the gauge injects a target pin (`|` or `▲` or `!`) into the bracketed bar, providing exact parity with `<BulletChart target={80} />`:
```text
[████████████░░|░░░░] 65% (tgt 80%)
```

#### TypeScript API:

```tsx
import type { HTMLAttributes } from 'react';
import type { AccentToken } from '../lib/theme';

export type AsciiGaugeVariant = 'block' | 'shade' | 'line' | 'ascii' | 'braille';

export interface AsciiGaugeProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Current value between min and max (default 0..100). */
  value: number;
  /** Minimum value range (default 0). */
  min?: number;
  /** Maximum value range (default 100). */
  max?: number;
  /** Optional target/benchmark threshold value. When provided, injects target marker. */
  target?: number;
  /** Total character width of the inner bar (excluding brackets, default 10). */
  length?: number;
  /** Enclosing boundary characters (default ['[', ']']). Pass null or empty for bare bar. */
  brackets?: [string, string] | null;
  /** Visual glyph set (default 'block'). */
  variant?: AsciiGaugeVariant;
  /** Accent role token for filled portion (default 'primary'). */
  accent?: AccentToken;
  /** Show numeric percentage readout after bar (default false). */
  showValue?: boolean;
}
```

---

### 2. Composite HUD Widget: `<TelemetryGauge />` (`blog` & DS SaaS suites)

Located in `blog/components/hud/TelemetryGauge.tsx`.

Composes `<AsciiGauge />` with machine state pills and dynamic metric formatting:

```text
+-------------------------------------------------------------+
| [CRUISE]  100% (52px/s)  [██████████]  LIVE BUFFER: OK      |
+-------------------------------------------------------------+
```

#### Telemetry States:
- `cruise` / `success`: Green badge (`intent-success`), steady velocity.
- `braking` / `warning`: Amber badge (`intent-warning`), deceleration curve active.
- `halted` / `danger`: Red badge (`intent-danger`), stationary at 0px/s.
- `spooling` / `accent`: Cyan/Blue badge (`accent-primary`), accelerating flywheel.

#### TypeScript API:

```tsx
export type TelemetryMachineState = 'cruise' | 'braking' | 'halted' | 'spooling' | 'idle';

export interface TelemetryGaugeProps {
  /** Machine state name rendered in the status pill. */
  state?: TelemetryMachineState;
  /** Custom state label override (defaults to uppercase state string). */
  stateLabel?: string;
  /** Normalized value (0 to 100). */
  value: number;
  /** Human-readable metric readout (e.g. "52px/s", "100%", "4.2 MB/s"). */
  metricLabel?: string;
  /** Number of ASCII bar segments (default 8). */
  barSegments?: number;
  /** ASCII glyph variant passed to underlying <AsciiGauge />. */
  gaugeVariant?: AsciiGaugeVariant;
  /** Compact mode hiding state pill on narrow viewports. */
  compact?: boolean;
  className?: string;
}
```

---

## Dual-Mode Theming Contract

### Midnight (Dark CRT Neon)
- **Container**: `bg-surface-raised` (`#121324`), `border-2 border-border-strong` (`#3b4261`).
- **Gauge Fill**: `text-accent-primary` (`#00f0ff` neon cyan) with subtle text-shadow phosphor glow.
- **Unfilled Glyphs**: `text-text-muted` (`#565f89` / `#23262e`).
- **State Pills**: High-chroma solid fills (`intent-success` `#00ff66`, `intent-warning` `#ffcc00`, `intent-danger` `#ff3366`).

### Sketch (Warm Paper & Drafting Ink)
- **Container**: `bg-surface-base` (`#ffffff`), `border-2 border-border-strong` (`#23262e`).
- **Gauge Fill**: `text-text-primary` (`#23262e` graphite ink).
- **Target Marker**: `text-accent-primary` (`#1450d7` technical blue drafting pen).
- **Unfilled Glyphs**: `text-border-subtle` (`#e0dcd0`).
- **Letterpress Shadow**: Strict `2px 2px 0px #23262e` offset.

---

## Harmonization Checklist & Next Actions

- [ ] **Design System Primitive**: Add `AsciiGauge.tsx`, `AsciiGauge.test.tsx`, and Storybook stories to `@rtkelly13/design-system`.
- [ ] **Cross-Link Chart Docs**: In `design-system/docs/components/charts.md`, document the relationship between `<BulletChart />` (SVG KPI benchmark) and `<AsciiGauge />` (Monospace text benchmark).
- [ ] **Blog Composite Widget**: Implement `TelemetryGauge.tsx` in `blog` consuming `<AsciiGauge />`.
- [ ] **TickerTape Integration**: Connect `TickerTape` velocity state (`currentRate`) to `<TelemetryGauge />` inside the `endAddon` slot.
- [ ] **Accessibility (a11y)**: Ensure `role="meter"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` are emitted deterministically by `<AsciiGauge />`.

