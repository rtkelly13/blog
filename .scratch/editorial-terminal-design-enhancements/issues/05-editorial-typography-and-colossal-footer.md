# Issue 05: Editorial Typography Scale & Calibrated Footer Signature

Status: needs-triage

## Summary

Enhance blog article typographic scale and introduce a calibrated brutalist footer signature banner (`clamp(1.5rem, 3.8vw, 3.25rem)`), adapting the editorial signoff concept from `matthewphillips.info`.

## Motivation

Standard web layouts often rely on safe, generic title sizing that feels floaty and unanchored. Matthew Phillips demonstrates how massive clamp-scaled titles with sub-`0.9` line-heights create striking visual bookends. However, Matthew Phillips' full-screen colossal footer (`clamp(60px, 14vw, 200px)`) is disproportionately large and overwhelms footer navigation. We calibrate the footer to a confident, proportioned architectural signoff (`clamp(1.5rem, 3.8vw, 3.25rem)`).

## Requirements & Design Spec

1. **Article Title Clamp Scale**:
   - `font-display text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tighter`.
   - CSS clamp rule: `font-size: clamp(2.75rem, 6.5vw, 5.5rem); line-height: 0.88; text-wrap: balance;`.
   - Preserves high readability and dramatic visual impact without breaking mobile layouts.
2. **Heavy 8px Accent-Bordered Callouts & Fences**:
   - Quotes and system callouts: `border-l-8 border-accent-primary bg-surface-sunken p-6 font-mono text-xl uppercase font-bold tracking-tight`.
   - Code fences: `border-l-8 border-accent-secondary`.
3. **Calibrated Footer Signature Banner**:
   - Confident statement in the footer (e.g. `RYAN KELLY · SYSTEMS & SOFTWARE` with `[ ryankelly.dev ]` badge):
     `font-display font-extrabold uppercase tracking-tight text-text-primary` with clamp sizing `clamp(1.5rem, 3.8vw, 3.25rem)` and `line-height: 1.1`.
   - Bounded above by `border-t-4 border-border-strong`.
   - Balanced vertical rhythm with 3-column navigation links and copyright bar underneath.

## Acceptance Criteria

- [ ] Headline typography scales responsively from mobile viewports (360px) to ultra-wide (1920px) without overflow.
- [ ] Footer signature provides strong visual closure without dwarfing the navigation columns or the article header.
- [ ] Dual-theme parity across Midnight and Sketch.

## Comments

- 2026-09-14: Calibrated footer size down from raw `14vw` (which felt oversized) to `clamp(1.5rem, 3.8vw, 3.25rem)`.

