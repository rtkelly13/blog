import { Boxes } from 'lucide-react';

const WEIGHTS = [
  { w: 1.5, label: 'Iconoir · 1.5px', tone: 'text-zinc-400' },
  { w: 2, label: 'Lucide / Tabler · 2px', tone: 'text-brutalist-cyan' },
  { w: 2.5, label: 'heavier · 2.5px', tone: 'text-zinc-400' },
];

/**
 * Why a 1.5px pack loses on a system whose every border is 2px: the icon is
 * shown inside the border it has to live next to, so the weight mismatch is
 * a comparison rather than a claim.
 */
export default function StrokeWeight() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {WEIGHTS.map(({ w, label, tone }) => (
          <div key={w} className="border-2 border-white bg-black p-5">
            <div className="mb-4 flex items-center justify-center border-2 border-white bg-zinc-900 p-6">
              <Boxes
                className={`h-16 w-16 ${tone}`}
                strokeWidth={w}
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            </div>
            <span className="block text-center font-mono text-[11px] uppercase text-white">
              {label}
            </span>
            <span className="mt-1 block text-center font-mono text-[9px] text-zinc-400">
              {w === 2
                ? 'matches the frame'
                : w < 2
                  ? 'reads lighter than the frame'
                  : 'reads heavier than the frame'}
            </span>
          </div>
        ))}
      </div>
      <p className="max-w-3xl font-mono text-xs text-zinc-400">
        <span className="text-brutalist-yellow">&gt;</span> The border around
        each icon is the system's standard 2px. At 1.5px the glyph reads as a
        lighter weight class than the box it sits in — which is the whole case
        against Iconoir here, and it has nothing to do with the quality of the
        drawing.
      </p>
    </div>
  );
}
