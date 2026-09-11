import { ChevronRight, ExternalLink, File, Menu, Search } from 'lucide-react';
import { PIXEL_SPECIMENS } from './packs';

const LUCIDE_EQUIVALENTS = {
  menu: Menu,
  search: Search,
  'external-link': ExternalLink,
  'chevron-right': ChevronRight,
  file: File,
} as const;

/**
 * Pixelarticons against the Lucide equivalents, set beside the VT323 pixel
 * face the header already uses. The argument is grammar, not preference: the
 * pixel glyph and the pixel font are drawn on the same grid.
 */
export default function PixelPairing() {
  return (
    <div className="space-y-4">
      <div className="border-2 border-white bg-black p-6">
        <div className="mb-6 flex flex-wrap items-baseline gap-4 border-b-2 border-zinc-700 pb-4">
          <span className="font-pixel text-5xl text-brutalist-cyan">
            ryankelly.dev
          </span>
          <span className="font-mono text-[10px] uppercase text-zinc-400">
            VT323 · the face already in the header
          </span>
        </div>

        <div className="grid gap-0.5 bg-zinc-700 sm:grid-cols-5">
          {PIXEL_SPECIMENS.map((spec) => {
            const Lucide =
              LUCIDE_EQUIVALENTS[spec.name as keyof typeof LUCIDE_EQUIVALENTS];
            return (
              <div
                key={spec.name}
                className="flex flex-col items-center gap-3 bg-black px-2 py-4"
              >
                <svg
                  role="img"
                  aria-label={`Pixelarticons ${spec.name}`}
                  viewBox="0 0 24 24"
                  width={40}
                  height={40}
                  fill="currentColor"
                  className="text-brutalist-cyan"
                >
                  {spec.paths.map((d) => (
                    <path key={d} d={d} />
                  ))}
                </svg>
                <Lucide
                  className="h-10 w-10 text-zinc-500"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
                <span className="font-mono text-[9px] text-zinc-400">
                  {spec.name}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex gap-4 font-mono text-[10px] uppercase">
          <span className="text-brutalist-cyan">top · Pixelarticons (MIT)</span>
          <span className="text-zinc-500">bottom · Lucide equivalent</span>
        </div>
      </div>

      <p className="max-w-3xl font-mono text-xs text-zinc-400">
        <span className="text-brutalist-yellow">&gt;</span> Not a replacement —
        an accent, scoped to the surfaces that already speak pixel (the logo,
        the hero, the Terminal interactive). Site-wide it would fight Lucide
        rather than accent it, which is a decision the design system should
        write down rather than drift into.
      </p>
    </div>
  );
}
