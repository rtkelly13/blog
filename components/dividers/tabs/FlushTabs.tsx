import { useId, useState } from 'react';
import DividerBody from '../DividerBody';
import { accentOf } from '../dividerAccents';
import type { DividerSetProps } from '../types';
import TabLabel from './TabLabel';

/**
 * **Flush** — the plain notebook read, and the baseline for the family: a
 * column of vertical tabs pinned tight to the left edge, each sized to its own
 * label so the rail is as ragged as a real set of index tabs. The open tab
 * fills with its accent and is pulled half a border to the right, so it covers
 * the rail's rule and reads as continuous with the page it belongs to.
 *
 * Nothing is centred, spaced or distributed: tabs stack from the top and stop.
 * That is the point — a notebook's tabs run out partway down the edge.
 */
export default function FlushTabs({
  dividers,
  initialIndex = 0,
  openOnHover = false,
}: DividerSetProps) {
  const [active, setActive] = useState(initialIndex);
  const id = useId();
  const current = dividers[active];

  return (
    <div className="flex h-full w-full overflow-hidden border-2 border-white bg-black">
      <div className="flex w-[2.75rem] shrink-0 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-r-2 border-white bg-black">
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
              className={`relative flex shrink-0 items-center justify-center border-b-2 border-white py-4 transition-colors ${
                open
                  ? `z-10 -mr-0.5 ${accent.fill}`
                  : 'bg-black text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
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
