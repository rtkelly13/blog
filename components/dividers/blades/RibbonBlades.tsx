import { useId, useState } from 'react';
import DividerBody from '../DividerBody';
import { accentOf } from '../dividerAccents';
import type { DividerSetProps } from '../types';

/**
 * **Ribbon** — the direct answer to "instead of a header": a full-width bar of
 * segments where the open segment widens and drops a divider down over the page.
 * Closed, it costs the same vertical space a header bar does; open, it hands
 * the section a whole panel.
 *
 * Clicking the open segment shuts the divider again, so the bar can sit at rest
 * with nothing selected.
 */
export default function RibbonBlades({
  dividers,
  initialIndex = 0,
  openOnHover = false,
}: DividerSetProps) {
  const [active, setActive] = useState<number | null>(initialIndex);
  const id = useId();

  const current = active === null ? null : dividers[active];

  return (
    <div className="w-full">
      <div className="flex w-full border-2 border-white bg-black">
        {dividers.map((divider, index) => {
          const open = index === active;
          const accent = accentOf(divider.accent);

          return (
            <button
              key={divider.id}
              type="button"
              aria-expanded={open}
              aria-controls={`${id}-panel`}
              onClick={() => setActive(open ? null : index)}
              onMouseEnter={openOnHover ? () => setActive(index) : undefined}
              style={{ flexGrow: open ? 2.2 : 1, flexBasis: 0 }}
              className={`relative min-w-0 border-r-2 border-white px-3 py-3 transition-[flex-grow] duration-[400ms] ease-out last:border-r-0 ${
                open ? 'bg-zinc-900' : 'bg-black hover:bg-zinc-900'
              }`}
            >
              <span
                aria-hidden
                className={`absolute inset-x-0 bottom-0 h-1 transition-opacity duration-300 ${accent.bar} ${
                  open ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <span
                className={`block truncate font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                  open ? accent.text : 'text-zinc-400'
                }`}
              >
                {divider.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* The drop. `grid-template-rows: 0fr -> 1fr` animates an auto height
          without pinning a magic max-height that clips longer dividers. */}
      <div
        id={`${id}-panel`}
        style={{ gridTemplateRows: current ? '1fr' : '0fr' }}
        className="grid transition-[grid-template-rows] duration-300 ease-out"
      >
        <div className="overflow-hidden">
          {current ? (
            <div className="border-2 border-t-0 border-white bg-zinc-900">
              <DividerBody divider={current} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
