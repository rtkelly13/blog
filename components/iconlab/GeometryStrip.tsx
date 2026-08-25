import { useState } from 'react';
import GlyphSpecimen from './Glyph';
import { ARROW_SPECIMENS } from './packs';

const SIZES = [16, 20, 24, 44] as const;

/**
 * The same arrow-up from ten packs, at the sizes the site actually renders
 * icons at. Toggling the caps shows which packs a stylesheet can re-cut and
 * which have the terminal shape baked into the outline.
 */
export default function GeometryStrip() {
  const [square, setSquare] = useState(false);
  const [size, setSize] = useState<number>(44);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setSquare((s) => !s)}
          aria-pressed={square}
          className={`border-2 px-3 py-1.5 font-mono text-xs uppercase shadow-hard-sm transition-colors ${
            square
              ? 'border-brutalist-cyan bg-brutalist-cyan text-black'
              : 'border-white bg-zinc-900 text-white hover:text-brutalist-cyan'
          }`}
        >
          stroke-linecap: {square ? 'square' : 'round'}
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase text-zinc-400">
            size
          </span>
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              aria-pressed={size === s}
              className={`border-2 px-2 py-1 font-mono text-[10px] transition-colors ${
                size === s
                  ? 'border-brutalist-yellow text-brutalist-yellow'
                  : 'border-zinc-600 text-zinc-400 hover:border-white hover:text-white'
              }`}
            >
              {s}px
            </button>
          ))}
        </div>
      </div>

      <p className="font-mono text-xs text-zinc-400">
        <span className="text-brutalist-yellow">&gt;</span>{' '}
        {square
          ? 'One CSS rule re-cut every stroke set. The fill sets did not move — nothing in a stylesheet reaches them.'
          : 'Lucide, Tabler and Iconoir ship round caps and joins by default. Toggle to see which packs a stylesheet can reach.'}
      </p>

      <div className="grid grid-cols-2 gap-0.5 bg-white lg:grid-cols-5">
        {ARROW_SPECIMENS.map((glyph) => (
          <div
            key={`${glyph.packId}-${glyph.note}`}
            className={`flex flex-col items-center gap-2 px-2 py-4 ${
              glyph.packId === 'lucide' ? 'bg-zinc-900' : 'bg-black'
            }`}
          >
            <div
              className="flex items-center justify-center text-white"
              style={{ height: 48 }}
            >
              <GlyphSpecimen glyph={glyph} size={size} square={square} />
            </div>
            <span
              className={`font-mono text-[11px] ${
                glyph.packId === 'lucide' ? 'text-brutalist-cyan' : 'text-white'
              }`}
            >
              {glyph.label}
            </span>
            <span className="text-center font-mono text-[9px] text-zinc-400">
              {glyph.note}
            </span>
            <span
              className={`border px-1 font-mono text-[9px] uppercase ${
                glyph.squareable
                  ? 'border-brutalist-cyan text-brutalist-cyan'
                  : 'border-zinc-600 text-zinc-500'
              }`}
            >
              {glyph.squareable ? 'CSS reaches it' : 'baked'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
