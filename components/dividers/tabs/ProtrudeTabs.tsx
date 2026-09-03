import { useId, useState } from 'react';
import DividerBody from '../DividerBody';
import { accentOf } from '../dividerAccents';
import type { DividerSetProps } from '../types';
import TabLabel from './TabLabel';

/**
 * **Protrude** — the physical read. The page keeps its own complete rectangle
 * and the tabs are glued to its left edge, tucked back under the screen edge
 * until they are chosen: a shut tab sits most of the way off the left of the
 * frame, and the open one is pulled proud so its right edge meets the page.
 *
 * The only variation in the family where a tab is partly *off* the screen, and
 * the reason to want it: at rest the rail costs about a centimetre of colour,
 * and choosing a section is a physical pull rather than a highlight.
 */
export default function ProtrudeTabs({
  dividers,
  initialIndex = 0,
}: DividerSetProps) {
  const [active, setActive] = useState(initialIndex);
  const id = useId();
  const current = dividers[active];

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div
        id={`${id}-sheet`}
        className="absolute inset-y-0 right-0 left-[2.5rem] border-2 border-white bg-zinc-900"
      >
        {current ? <DividerBody divider={current} /> : null}
      </div>

      <div className="absolute inset-y-0 left-0 flex w-[2.5rem] flex-col justify-start gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-2">
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
              style={{ transform: `translateX(${open ? 0 : -1}rem)` }}
              className={`relative flex shrink-0 items-center justify-center border-2 border-white py-3 transition-transform duration-300 ease-out ${
                open
                  ? `z-10 ${accent.fill}`
                  : 'bg-black text-zinc-400 hover:text-white'
              }`}
            >
              <TabLabel>{divider.label}</TabLabel>
            </button>
          );
        })}
      </div>
    </div>
  );
}
