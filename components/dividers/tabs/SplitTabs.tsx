import { useId, useState } from 'react';
import DividerBody from '../DividerBody';
import { accentOf } from '../dividerAccents';
import type { DividerSetProps } from '../types';
import TabLabel from './TabLabel';

/**
 * **Split** — the same rail, divided evenly: every tab takes an equal share of
 * the full height, so the column always reaches the bottom of the viewport
 * however many sections there are.
 *
 * The open tab does not fill. It takes the sheet's own surface and drops its
 * right rule, so tab and page read as one piece of paper folded round the
 * edge; the accent survives as a bar tight against the very edge of the
 * screen, which is the only part of a real notebook tab you see when the book
 * is shut.
 */
export default function SplitTabs({
  dividers,
  initialIndex = 0,
  openOnHover = true,
}: DividerSetProps) {
  const [active, setActive] = useState(initialIndex);
  const id = useId();
  const current = dividers[active];

  return (
    <div className="flex h-full w-full overflow-hidden border-2 border-white bg-black">
      <div className="flex w-[2.75rem] shrink-0 flex-col">
        {dividers.map((divider, index) => {
          const open = index === active;
          const accent = accentOf(divider.accent);

          return (
            <button
              key={divider.id}
              type="button"
              aria-expanded={open}
              aria-controls={`${id}-sheet`}
              onClick={() => setActive(index)}
              onFocus={openOnHover ? () => setActive(index) : undefined}
              onMouseEnter={openOnHover ? () => setActive(index) : undefined}
              className={`relative flex flex-1 items-center justify-center border-white border-b-2 transition-colors last:border-b-0 ${
                open
                  ? `z-10 -mr-0.5 bg-zinc-900 font-bold text-white`
                  : 'border-r-2 bg-black text-zinc-500 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <span
                aria-hidden
                className={`absolute inset-y-0 left-0 transition-all ${accent.bar} ${
                  open ? 'w-2.5 opacity-100' : 'w-1 opacity-30'
                }`}
              />
              <TabLabel>{divider.label}</TabLabel>
            </button>
          );
        })}
      </div>

      <div id={`${id}-sheet`} className="min-w-0 flex-1 bg-zinc-900">
        {current ? <DividerBody divider={current} /> : null}
      </div>
    </div>
  );
}
