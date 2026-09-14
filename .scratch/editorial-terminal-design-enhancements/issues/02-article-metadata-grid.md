# Issue 02: 4-Column Structured Article Metadata Grid

Status: needs-triage

## Summary

Replace the current single-line post metadata header (`By Ryan Kelly · Sept 14 · 5 min read`) with a structured, 4-column brutalist metadata matrix inspired by `matthewphillips.info`.

## Motivation

Dense technical and architectural essays benefit from an upfront, high-contrast metadata manifest. Stacking a muted key label (`.k`) over a prominent value (`.v`) inside a bordered grid treats metadata like a system spec or ledger entry.

## Requirements & Design Spec

1. **Grid Layout**:
   - Desktop: `grid grid-cols-4 gap-6`.
   - Mobile: `grid-cols-2 gap-4`.
   - Delimited above and below by `border-t-2 border-b-2 border-border-strong` (or 4px bottom border).
2. **Typography & Styling**:
   - Keys (`.k`): `font-mono text-xs font-bold uppercase tracking-widest text-text-muted opacity-70 mb-1`.
   - Values (`.v`): `font-mono text-sm font-extrabold uppercase tracking-wide text-text-primary`.
3. **Supported Fields**:
   - `Published` (e.g. `2026-09-14`)
   - `Read Time` (e.g. `8 MIN READ`)
   - `Series / Track` (e.g. `DISTRIBUTED STORAGE`)
   - `Tags` (e.g. `KAFKA · RAFT · C#`)
4. **Interactive Tags**:
   - Tags inside the grid should use subtle underlines or pill borders with inverse hover state (`hover:bg-text-primary hover:text-surface-base`).

## Proposed API

```tsx
interface ArticleMetadataGridProps {
  date: string;
  readingTime: string;
  series?: string;
  tags?: string[];
  className?: string;
}
```

## Acceptance Criteria

- [ ] Replaces or augments existing MDX post layout header.
- [ ] Fully responsive down to 320px viewport without overflow.
- [ ] Tested and verified in Midnight and Sketch themes.
- [ ] Conforms to `@rtkelly13/design-system` semantic tokens.

## Comments
