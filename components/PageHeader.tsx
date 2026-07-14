import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The one page-header primitive for listing / index pages.
 *
 * Canonical form (extracted from the Talks + Projects headers, which had
 * already converged on it): a `bg-zinc-900` title block holding an optional
 * lucide icon, a bracketed `[ TITLE ]` in the display face, and a mono
 * subtitle prefixed with the `>` prompt glyph. Pages own their content
 * wrapper (`border-2 border-white bg-black divide-y divide-white`) and drop
 * this in as the first child so every listing page reads the same.
 *
 * `accent` themes the icon + prompt glyph through the `--brutalist-*` tokens,
 * so the per-section colour rule (blog→cyan, talks→pink, ideas→yellow) lives
 * in one place instead of being re-hardcoded on each page.
 */
type Accent = 'cyan' | 'pink' | 'yellow';

const ACCENT_TEXT: Record<Accent, string> = {
  cyan: 'text-brutalist-cyan',
  pink: 'text-brutalist-pink',
  yellow: 'text-brutalist-yellow',
};

interface Props {
  /** Rendered bracketed + uppercased as `[ TITLE ]`. */
  title: string;
  /** Mono strapline under the title, prefixed with the `>` prompt glyph. */
  subtitle?: ReactNode;
  /** Optional leading glyph — a lucide icon, kept on-brand (no emoji). */
  icon?: LucideIcon;
  /** Themes the icon + prompt glyph. Defaults to cyan. */
  accent?: Accent;
  /** Extra header content (badges, admin notes) below the subtitle. */
  children?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  icon: Icon,
  accent = 'cyan',
  children,
}: Props) {
  const accentText = ACCENT_TEXT[accent];
  return (
    <div className="bg-zinc-900 px-6 pt-8 pb-10">
      <div className="mb-4 flex items-center gap-4">
        {Icon && <Icon className={`h-10 w-10 ${accentText}`} />}
        <h1 className="font-display text-4xl font-bold uppercase text-white md:text-6xl">
          [ {title} ]
        </h1>
      </div>
      {subtitle && (
        <p className="mt-4 font-mono text-lg text-zinc-400">
          <span className={accentText}>&gt;</span> {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
