import { useId, useState } from 'react';
import DividerBody from '../DividerBody';
import { accentOf } from '../dividerAccents';
import type { DividerSetProps } from '../types';
import TabLabel from './TabLabel';

/**
 * **Sliver** — the cheapest rail in the family. At rest it is nothing but a
 * column of coloured page edges hard against the left of the screen: no
 * labels, no chrome, about nine pixels of navigation. Pointing at it (or
 * tabbing into it) widens the rail and the labels fade up.
 *
 * The rail is absolutely positioned, so widening it slides over the page
 * rather than reflowing it — the reading column never moves, which is the
 * whole reason to prefer this over a rail that pushes.
 */
export default function SliverTabs({
  dividers,
  initialIndex = 0,
}: DividerSetProps) {
  const [active, setActive] = useState(initialIndex);
  const [open, setOpen] = useState(false);
  const id = useId();
  const current = dividers[active];

  return (
    <div className="relative h-full w-full overflow-hidden border-2 border-white bg-zinc-900">
      <div id={`${id}-sheet`} className="h-full pl-[0.55rem]">
        {current ? <DividerBody divider={current} /> : null}
      </div>

      <div
        style={{ width: open ? '2.75rem' : '0.55rem' }}
        className="absolute inset-y-0 left-0 flex flex-col transition-[width] duration-300 ease-out"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocusCapture={() => setOpen(true)}
        onBlurCapture={() => setOpen(false)}
      >
        {dividers.map((divider, index) => {
          const on = index === active;
          const accent = accentOf(divider.accent);

          return (
            <button
              key={divider.id}
              type="button"
              aria-expanded={on}
              aria-controls={`${id}-sheet`}
              onClick={() => setActive(index)}
              className={`flex flex-1 items-center justify-center overflow-hidden transition-opacity ${accent.fill} ${
                on ? 'opacity-100' : 'opacity-55 hover:opacity-80'
              }`}
            >
              <TabLabel
                className={`transition-opacity duration-200 ${
                  open ? 'opacity-100 delay-100' : 'opacity-0'
                }`}
              >
                {divider.label}
              </TabLabel>
            </button>
          );
        })}
      </div>
    </div>
  );
}
