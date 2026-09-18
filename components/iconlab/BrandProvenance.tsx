import { Check, TriangleAlert } from 'lucide-react';
import { BRAND_MARKS } from './packs';

/**
 * What `components/social-icons/icons.tsx` actually ships today: five paths
 * copied by hand, four of them from Simple Icons and one from nowhere the
 * file names. The licence argument is easier to see than to describe.
 */
export default function BrandProvenance() {
  return (
    <div className="space-y-4">
      <div className="grid gap-0.5 bg-white sm:grid-cols-5">
        {BRAND_MARKS.map((mark) => (
          <div
            key={mark.kind}
            className="flex flex-col items-center gap-3 bg-black px-3 py-5"
          >
            <svg
              role="img"
              aria-label={`${mark.kind} mark`}
              viewBox={mark.viewBox}
              width={36}
              height={36}
              fill="currentColor"
              className={
                mark.declared ? 'text-brutalist-cyan' : 'text-brutalist-pink'
              }
            >
              <path d={mark.path} />
            </svg>
            <span className="font-mono text-[11px] uppercase text-white">
              {mark.kind}
            </span>
            <span
              className={`flex items-center gap-1 border px-1 font-mono text-[9px] uppercase ${
                mark.declared
                  ? 'border-brutalist-cyan text-brutalist-cyan'
                  : 'border-brutalist-pink text-brutalist-pink'
              }`}
            >
              {mark.declared ? (
                <Check className="h-3 w-3" strokeLinecap="square" />
              ) : (
                <TriangleAlert className="h-3 w-3" strokeLinecap="square" />
              )}
              {mark.licence}
            </span>
            <span className="text-center font-mono text-[9px] leading-relaxed text-zinc-400">
              {mark.provenance}
            </span>
          </div>
        ))}
      </div>

      <p className="max-w-3xl font-mono text-xs text-zinc-400">
        <span className="text-brutalist-yellow">&gt;</span> The header comment
        in <code>icons.tsx</code> already says these came from Simple Icons, and
        the GitHub path still matches upstream byte for byte. So the
        recommendation is not "switch packs" — it is{' '}
        <span className="text-white">stop vendoring</span>. A dependency
        version-tracks the marks, ships its own CC0 declaration, and would have
        surfaced that the mail glyph is not a brand mark at all.
      </p>
    </div>
  );
}
