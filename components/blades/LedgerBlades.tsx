import { useId, useState } from 'react';
import BladeBody from './BladeBody';
import { accentOf } from './bladeAccents';
import type { BladesProps } from './types';

/**
 * **Ledger** — the address-book read: one card face with its siblings' tabs
 * staggered down the right-hand gutter, and the rest of the box showing as
 * offset edges behind the face. Choosing a tab brings that card forward and
 * pushes its tab out into the gutter.
 *
 * Where **Rail** puts the whole navigation permanently on screen, Ledger keeps
 * one section in focus and the others merely within reach — the better fit for
 * a reading page, where the content is the point.
 */
export default function LedgerBlades({
  blades,
  initialIndex = 0,
}: BladesProps) {
  const [active, setActive] = useState(initialIndex);
  const id = useId();
  const current = blades[active];

  return (
    <div className="relative h-full w-full bg-black p-4">
      {/* The rest of the box: card edges peeking out behind the face. */}
      {[3, 2, 1].map((offset) => (
        <span
          key={offset}
          aria-hidden
          style={{ transform: `translate(${offset * -4}px, ${offset * -4}px)` }}
          className="absolute inset-y-4 left-4 right-[6.5rem] border-2 border-zinc-700 bg-zinc-900"
        />
      ))}

      <div
        id={`${id}-face`}
        className="absolute inset-y-4 left-4 right-[6.5rem] border-2 border-white bg-zinc-900"
      >
        {current ? <BladeBody blade={current} /> : null}
      </div>

      <div className="absolute inset-y-4 right-4 flex w-[6.5rem] flex-col justify-start gap-1.5">
        {blades.map((blade, index) => {
          const open = index === active;
          const accent = accentOf(blade.accent);

          return (
            <button
              key={blade.id}
              type="button"
              aria-expanded={open}
              aria-controls={`${id}-face`}
              onClick={() => setActive(index)}
              onFocus={() => setActive(index)}
              style={{ transform: `translateX(${open ? 0 : 1.25}rem)` }}
              className={`flex h-[2.6rem] items-center border-2 border-l-0 px-2 text-left transition-transform duration-300 ease-out ${
                open
                  ? `${accent.border} ${accent.fill}`
                  : 'border-white bg-black text-zinc-400 hover:text-white'
              }`}
            >
              <span className="truncate font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em]">
                {blade.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
