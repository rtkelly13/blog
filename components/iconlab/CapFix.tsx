import { ChevronRight, ExternalLink, FileText, Star } from 'lucide-react';
import { useState } from 'react';
import { LUCIDE_FILE_TEXT } from './packs';

/** Lucide accepts SVG presentation props, and the child paths inherit them. */
const ROUND = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const SQUARE = { strokeLinecap: 'square', strokeLinejoin: 'miter' } as const;

/**
 * The proposed rule, applied to real chrome rather than an icon grid: the
 * same header, button and metadata row rendered as shipped and as the rule
 * would render it, so the caps can be judged against the 2px borders they
 * actually sit next to.
 */
function Chrome({ square }: { square: boolean }) {
  const caps = square ? SQUARE : ROUND;

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-3 border-2 border-white bg-black px-3 py-2">
        <FileText className="h-6 w-6 text-brutalist-cyan" {...caps} />
        <span className="font-display text-lg font-bold uppercase text-white">
          [ BLOG ]
        </span>
      </div>

      <button className="flex items-center gap-2 border-2 border-white bg-brutalist-cyan px-4 py-2 font-mono text-sm font-bold uppercase text-black shadow-hard-sm">
        Read post
        <ChevronRight className="h-4 w-4" {...caps} />
      </button>

      <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <Star className="h-4 w-4 text-brutalist-yellow" {...caps} />
          featured
        </span>
        <span className="flex items-center gap-1.5">
          <ExternalLink className="h-4 w-4 text-brutalist-pink" {...caps} />
          archived link
        </span>
      </div>

      <div className="flex items-end gap-4 border-t-2 border-zinc-700 pt-4">
        <ChevronRight className="h-24 w-24 text-white" {...caps} />
        <span className="pb-2 font-mono text-[10px] uppercase text-zinc-400">
          96px — the same
          <br />
          terminal, magnified
        </span>
      </div>
    </div>
  );
}

export function CapFixDemo() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="border-2 border-zinc-600 bg-zinc-900">
          <div className="border-b-2 border-zinc-600 px-3 py-1.5">
            <span className="font-mono text-xs font-bold uppercase text-zinc-400">
              as shipped · round caps
            </span>
          </div>
          <Chrome square={false} />
        </div>

        <div className="border-2 border-brutalist-cyan bg-zinc-900 shadow-hard-cyan">
          <div className="border-b-2 border-brutalist-cyan px-3 py-1.5">
            <span className="font-mono text-xs font-bold uppercase text-brutalist-cyan">
              with the rule · square caps
            </span>
          </div>
          <Chrome square={true} />
        </div>
      </div>

      <pre className="overflow-x-auto border-2 border-white bg-black p-4 font-mono text-xs text-white">
        <span className="text-zinc-500">{'/* css/tailwind.css */'}</span>
        {'\n'}
        <span className="text-brutalist-cyan">.lucide</span>
        {' {\n  '}
        <span className="text-brutalist-yellow">stroke-linecap</span>
        {': square;\n  '}
        <span className="text-brutalist-yellow">stroke-linejoin</span>
        {': miter;\n}'}
      </pre>

      <p className="max-w-3xl font-mono text-xs text-zinc-400">
        <span className="text-brutalist-yellow">&gt;</span> Lucide sets both as
        presentation attributes on the root <code>&lt;svg&gt;</code> and the
        child paths inherit them. Presentation attributes lose to any CSS rule,
        so one selector re-cuts every icon on the site — including the ones
        added next year. No import site changes.
      </p>
    </div>
  );
}

/**
 * The caveat, made visible: squaring the caps does not remove the corner
 * radii baked into the path data. Lucide draws the document corners of
 * `file-text` as `a 2 2 0 0 1` arcs.
 */
export function BakedCorners() {
  const [annotate, setAnnotate] = useState(true);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setAnnotate((a) => !a)}
        aria-pressed={annotate}
        className={`border-2 px-3 py-1.5 font-mono text-xs uppercase shadow-hard-sm transition-colors ${
          annotate
            ? 'border-brutalist-pink bg-brutalist-pink text-black'
            : 'border-white bg-zinc-900 text-white hover:text-brutalist-pink'
        }`}
      >
        {annotate ? 'hide the arcs' : 'mark the arcs'}
      </button>

      <div className="grid gap-4 sm:grid-cols-2">
        {[false, true].map((square) => (
          <div
            key={String(square)}
            className="border-2 border-white bg-black p-6"
          >
            <span className="mb-4 block font-mono text-xs uppercase text-zinc-400">
              {square ? 'square caps' : 'round caps'}
            </span>
            <svg
              role="img"
              aria-label={`Lucide file-text with ${
                square ? 'square' : 'round'
              } caps`}
              viewBox="0 0 24 24"
              width={160}
              height={160}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap={square ? 'square' : 'round'}
              strokeLinejoin={square ? 'miter' : 'round'}
              className="text-white"
            >
              {LUCIDE_FILE_TEXT.map((d) => (
                <path key={d} d={d} />
              ))}
              {annotate ? (
                <g
                  className="text-brutalist-pink"
                  stroke="currentColor"
                  strokeWidth={0.6}
                  fill="none"
                >
                  <circle cx={6} cy={4} r={2.6} />
                  <circle cx={6} cy={20} r={2.6} />
                  <circle cx={18} cy={20} r={2.6} />
                </g>
              ) : null}
            </svg>
          </div>
        ))}
      </div>

      <p className="max-w-3xl font-mono text-xs text-zinc-400">
        <span className="text-brutalist-pink">&gt;</span> The circled corners do
        not move. The terminals square, the shape does not — nothing short of
        redrawing the paths gets a truly zero-radius icon out of Lucide. Worth
        knowing before the rule is sold as a complete fix.
      </p>
    </div>
  );
}
