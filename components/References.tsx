import { ArchiveRestore, ExternalLink } from 'lucide-react';
import { createContext, useContext } from 'react';
import type { Reference } from 'types/Reference';
import Link from '@/components/Link';

/**
 * Lets an author drop `<References />` into MDX to place the bibliography
 * mid-document. The layout provides the collected references here and wraps
 * the post body, so the inline component needs no props (see ADR-0006).
 */
export const ReferencesContext = createContext<Reference[]>([]);

interface Props {
  /**
   * The bibliography to render. Omit when used as an MDX component
   * (`<References />`) — it then reads the post's references from
   * `ReferencesContext` instead.
   */
  references?: Reference[];
  /**
   * Render a ↩ backlink to the first inline `[n]` citation marker. On for
   * blog posts (the MDX pipeline inserts markers); off for talk landing
   * pages, where slides carry no markers to jump back to.
   */
  backlinks?: boolean;
  /** Heading label — defaults to the LaTeX-style "References". */
  label?: string;
}

/**
 * LaTeX-style bibliography: every external link in the document, numbered in
 * order of first appearance, each with the original URL and its Wayback
 * Machine snapshot so the reference outlives link rot.
 */
export default function References({
  references: referencesProp,
  backlinks = true,
  label = 'References',
}: Props) {
  const contextReferences = useContext(ReferencesContext);
  const references = referencesProp ?? contextReferences;
  if (!references || references.length === 0) return null;

  return (
    <section
      aria-labelledby="references-heading"
      className="pt-6 pb-6 font-mono"
      data-testid="references"
    >
      <h2
        id="references-heading"
        className="text-xs tracking-wide text-brutalist-yellow font-bold uppercase mb-3"
      >
        [ {label} ]
      </h2>
      <ol className="border-2 border-white bg-zinc-900 divide-y divide-zinc-800 shadow-hard-md">
        {references.map((ref) => (
          <li
            key={ref.id}
            id={ref.id}
            className="flex gap-3 p-3 text-sm scroll-mt-24 target:bg-brutalist-cyan/10"
          >
            <span className="shrink-0 font-bold text-brutalist-yellow">
              [{ref.number}]
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white">
                {ref.title}
                <span className="ml-2 font-normal uppercase text-xs text-zinc-500">
                  {ref.domain}
                </span>
              </p>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
                <Link
                  href={ref.url}
                  className="inline-flex max-w-full items-baseline gap-1 text-brutalist-cyan hover:text-brutalist-pink transition-colors"
                >
                  <ExternalLink
                    className="h-3 w-3 shrink-0 self-center"
                    aria-hidden="true"
                  />
                  <span className="truncate break-all">{ref.url}</span>
                </Link>
                <Link
                  href={ref.archiveUrl}
                  className="inline-flex items-baseline gap-1 whitespace-nowrap text-zinc-400 hover:text-brutalist-yellow transition-colors"
                  title="Archived snapshot on the Wayback Machine"
                >
                  <ArchiveRestore
                    className="h-3 w-3 shrink-0 self-center"
                    aria-hidden="true"
                  />
                  archived
                </Link>
                {backlinks && (
                  <a
                    href={`#cite-${ref.number}`}
                    className="text-zinc-500 hover:text-white transition-colors"
                    aria-label={`Back to citation ${ref.number}`}
                  >
                    ↩
                  </a>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
