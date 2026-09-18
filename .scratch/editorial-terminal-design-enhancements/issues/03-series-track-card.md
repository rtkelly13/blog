# Issue 03: Series Track Container & Interactive Task Rows

Status: needs-triage

## Summary

Build a `SeriesTrackCard` component and `InteractiveRow` list primitive inspired by `builddistributedsystem.com/projects/mini-kafka`. This provides a modular container for multi-part article series, implementation roadmaps, or interactive talk workshops.

## Motivation

Multi-article deep-dives (e.g. Parquet serialization engines, distributed consensus, or event sourcing) require contextual roadmaps so the reader understands where the current article sits in the larger system.

## Requirements & Design Spec

1. **Card Container**:
   - Frame: `border-4 border-border-strong bg-surface-raised`.
   - Shadow: Heavy brutalist offset shadow `shadow-hard-lg` (8px offset, no blur).
   - Zero border radius (`rounded-none`).
2. **Track Header Banner**:
   - Section header with title, progress tally (`Part 2 of 4` or `1/3 completed`).
   - Summary description of the track.
   - **Brutalist Progress Bar**:
     - Outer frame: `w-full bg-surface-sunken border-2 border-border-strong h-3.5`.
     - Fill: High-contrast solid `bg-accent-primary border-r-2 border-border-strong`.
3. **Interactive Item Rows (`InteractiveRow`)**:
   - List rows with `border-2 border-border-strong p-4 bg-surface-base`.
   - Shadow: `shadow-hard-sm` (2px offset).
   - Hover state: elevates by `-translate-y-0.5` and transitions to `shadow-hard-md` (4px offset).
   - Left indicator: square terminal glyph or status marker (`[ ]` vs `[x]` or hollow/filled box).
   - Right indicator: arrow icon with micro-translate hover (`group-hover:translate-x-1.5`).
   - Difficulty / Type badge: `border border-border-strong px-2 py-0.5 font-mono text-xs font-bold uppercase` with role-based fills (`intent-success`, `intent-warning`, `intent-info`).

## Proposed API

```tsx
interface SeriesTrackItem {
  id: string;
  title: string;
  href: string;
  status: 'completed' | 'current' | 'upcoming';
  badge?: {
    label: string;
    variant: 'info' | 'success' | 'warning';
  };
}

interface SeriesTrackCardProps {
  title: string;
  description: string;
  totalCount: number;
  completedCount: number;
  items: SeriesTrackItem[];
}
```

## Acceptance Criteria

- [ ] Reusable in MDX via simple component tags.
- [ ] Fully accessible list semantics (`<nav>` / `<ol>` with aria labels).
- [ ] Verified across Midnight and Sketch themes.
- [ ] No gradients, no rounded corners.

## Comments
