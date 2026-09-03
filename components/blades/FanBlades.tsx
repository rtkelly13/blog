import { useId, useState } from 'react';
import BladeBody from './BladeBody';
import { accentOf } from './bladeAccents';
import type { BladesProps } from './types';

/**
 * **Fan** — the deck answer: the blades sit as an almost-closed stack until
 * the set is touched, then splay about a pivot below the frame like a hand of
 * cards or a fanned sheaf of dividers. Picking one lifts it out of the arc.
 *
 * The pivot deliberately sits *below* the visible area, so the arc stays
 * shallow and every spine label stays upright enough to read.
 */
export default function FanBlades({ blades, initialIndex = 0 }: BladesProps) {
  const [active, setActive] = useState(initialIndex);
  const [fanned, setFanned] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const id = useId();

  const centre = (blades.length - 1) / 2;
  const spread = fanned ? 15 : 6;
  const current = blades[active];

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div
        className="relative min-h-0 flex-1 overflow-hidden border-2 border-white bg-black"
        onMouseEnter={() => setFanned(true)}
        onMouseLeave={() => {
          setFanned(false);
          setHovered(null);
        }}
      >
        {blades.map((blade, index) => {
          const accent = accentOf(blade.accent);
          const open = index === active;
          const lifted = hovered === index || open;
          const angle = (index - centre) * spread;

          return (
            <button
              key={blade.id}
              type="button"
              aria-pressed={open}
              aria-controls={`${id}-panel`}
              onClick={() => setActive(index)}
              onFocus={() => {
                setFanned(true);
                setHovered(index);
              }}
              onBlur={() => setHovered(null)}
              onMouseEnter={() => setHovered(index)}
              style={{
                transform: `rotate(${angle}deg) translateY(${lifted ? -20 : 0}px)`,
                zIndex: lifted ? blades.length + 1 : index,
              }}
              className={`absolute bottom-[-4.5rem] left-1/2 -ml-[4.25rem] flex h-[15rem] w-[8.5rem] origin-bottom flex-col items-start border-2 bg-zinc-900 p-3 text-left transition-transform duration-300 ease-out ${
                open ? accent.border : 'border-white'
              }`}
            >
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-1.5 ${accent.bar} ${open ? 'opacity-100' : 'opacity-60'}`}
              />
              <span
                className={`mt-2 block font-mono text-xs font-bold uppercase tracking-widest ${
                  open ? accent.text : 'text-zinc-400'
                }`}
              >
                {blade.label}
              </span>
              <span className="mt-2 block font-mono text-[0.65rem] leading-snug text-zinc-500">
                {blade.items.length} links
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`${id}-panel`}
        className="h-[9.5rem] shrink-0 border-2 border-white bg-zinc-900"
      >
        {current ? <BladeBody blade={current} compact /> : null}
      </div>
    </div>
  );
}
