# Issue 01: Terminal Marquee TickerTape Component

Status: needs-triage

## Summary

Implement a continuous, horizontally scrolling ticker tape (`TickerTape`) component inspired by `matthewphillips.info`, designed to run directly beneath the blog header or at the top of longform articles and talk decks.

## Motivation

The brutalist neon-terminal aesthetic thrives on evoking a living machine or teleprinter. A ticker tape conveys real-time activity (recent posts, talk announcements, read times, git commit hashes, estate status) without crowding standard navigation.

## Requirements & Design Spec

1. **Continuous Marquee Animation with Momentum Easing**:
   - Seamless horizontal translation (`@keyframes ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`).
   - Duplicate track content for seamless infinite looping.
   - **Momentum Physics on Hover**: Rather than an abrupt binary `animation-play-state: paused`, use the **Web Animations API (`Animation.playbackRate`)** with a `requestAnimationFrame` damping curve.
     - **Deceleration**: When hovered, smoothly ease velocity from 100% down to 0% over ~850ms (Flywheel cubic ease) or ~450ms (Viscous damper).
     - **Acceleration**: When mouse leaves, smoothly spool velocity back up to 100% using the exact same symmetric curve.
     - **Zero Jumps**: Re-anchors velocity dynamically on rapid hover/leave toggles so the tape never stutters or restarts.
   - Strictly respect `prefers-reduced-motion: reduce` (renders static or wrapped).
2. **Content-Length Velocity Normalization (Dynamic Duration)**:
   - Rather than hardcoding fixed seconds (which makes few items crawl and many items fly past unreadably), calculate duration based on **pixels per second**:
     `calculatedDuration = trackWidth / pixelsPerSecond`
   - Clamped safely between `minDurationSeconds` (e.g. 15s) and `maxDurationSeconds` (e.g. 60s).
   - Guarantees **constant, comfortable reading speed** regardless of whether the tape contains 2 items or 20 items.
3. **Trailing Child Slot (`endAddon`)**:
   - A dedicated right-anchored slot (`border-l-2 border-border-strong` on `bg-surface-raised`) capable of hosting any child component without hardcoding:
     - The standalone `<TelemetryGauge />` (see [Issue 07](07-terminal-telemetry-gauge.md))
     - An RSS subscription button with blinking cursor (`Subscribe_`)
     - A live talk listener count badge (`● 42 LISTENING`)
     - A theme mode toggle
4. **Sticky Viewport Mode (`sticky?: boolean`)**:
   - When enabled, pins the ticker tape to `sticky top-0 z-40` (or directly beneath the site header) with an offset border/shadow, keeping live announcements or telemetry visible as the reader scrolls long essays.
5. **Item Separators**:
   - Geometric bullet dots (`w-2 h-2 bg-text-primary rounded-none`) or terminal pipes (`|` / `//`).
6. **Dual-Mode Theme Compatibility**:
   - Boundary: `border-b-2 border-border-strong`.
   - Typography: `font-mono text-xs font-bold uppercase tracking-widest`.
   - Colors: `bg-surface-base text-text-muted` with highlighted values in `text-text-primary` or `text-accent-primary`.
7. **Zero Border Radius**:
   - Separator dots must be square (`rounded-none`).

## Proposed API

```tsx
import { ReactNode } from 'react';

export interface TickerTapeItem {
  id: string;
  label: string;
  href?: string;
}

export interface TickerTapeProps {
  items: TickerTapeItem[];
  pixelsPerSecond?: number;       // default ~50px/s for comfortable reading
  minDurationSeconds?: number;    // default 15s floor
  maxDurationSeconds?: number;    // default 60s ceiling
  physics?: 'flywheel' | 'viscous' | 'linear' | 'instant';
  rampDurationMs?: number;        // default 850ms
  sticky?: boolean;               // stick to top on scroll
  endAddon?: ReactNode;           // right-anchored slot (e.g. <TelemetryGauge />)
  className?: string;
}
```

## Acceptance Criteria

- [ ] Reading speed stays uniform whether few or many items are rendered (`pixelsPerSecond` normalization with min/max clamp).
- [ ] Decelerates smoothly into a stop on hover and accelerates symmetrically back to cruise speed without jumpy phase shifts.
- [ ] `endAddon` slot accepts arbitrary React child components on the far right.
- [ ] `sticky` mode pins cleanly to viewport top without layout jitter or horizontal overflow.
- [ ] Motion stops or collapses gracefully under `prefers-reduced-motion`.
- [ ] Looks native in both Midnight (`data-theme="midnight"`) and Sketch (`data-theme="sketch"`).
- [ ] Zero external animation dependencies outside native WAAPI.

## Comments

- 2026-09-14: Added momentum physics requirement to eliminate binary freeze on hover, introducing symmetric WAAPI `playbackRate` easing.
- 2026-09-14: Decoupled Telemetry HUD into a dedicated standalone component ([Issue 07](07-terminal-telemetry-gauge.md)); converted right dock into generic `endAddon` slot.
- 2026-09-14: Added `sticky` viewport mode and dynamic content-length velocity calculation (`pixelsPerSecond` with min/max clamps).



