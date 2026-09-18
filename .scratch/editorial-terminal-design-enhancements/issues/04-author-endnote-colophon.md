# Issue 04: Editorial Author Endnote Colophon Card

Status: needs-triage

## Summary

Implement a dedicated `AuthorEndnote` colophon card inspired by `matthewphillips.info`, anchoring the conclusion of articles and talk transcripts with formal attribution, short bio, and inverse-hover contact links.

## Motivation

Rather than a generic floating author badge, longform essays benefit from an explicit editorial end-marker (colophon). Using formal section symbols (`§ ABOUT THE AUTHOR`) and brutalist bordered boxes grounds the post with weight and intent.

## Requirements & Design Spec

1. **Card Frame**:
   - `border-4 border-border-strong p-8 bg-surface-raised mt-16`.
   - Zero border radius (`rounded-none`).
2. **Typography & Layout**:
   - Section marker: `font-mono text-xs font-bold uppercase tracking-widest text-accent-primary mb-2` (`§ ABOUT THE AUTHOR` or `// COLOPHON`).
   - Author name: `font-mono text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary mb-3`.
   - Bio text: `font-sans text-base leading-relaxed text-text-secondary max-w-2xl mb-6`.
3. **Pill / Boxed Link Chips**:
   - Outlined buttons: `border-2 border-border-strong px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wide inline-flex items-center gap-1.5`.
   - **Inverse hover transition**: On hover, background becomes `bg-text-primary` and text becomes `text-surface-base`.
   - Arrow glyph: `→` with subtle translate.

## Proposed API

```tsx
interface AuthorEndnoteLink {
  label: string;
  href: string;
}

interface AuthorEndnoteProps {
  name: string;
  sectionLabel?: string;
  bio: string;
  links: AuthorEndnoteLink[];
  className?: string;
}
```

## Acceptance Criteria

- [ ] Placed at the end of post MDX layouts.
- [ ] Hover states invert cleanly in both Midnight and Sketch themes.
- [ ] Conforms to design system semantic tokens and zero-radius invariant.

## Comments
