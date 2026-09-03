import { useId, useState } from 'react';
import BladeBody from './BladeBody';
import { accentOf } from './bladeAccents';
import type { BladesProps } from './types';

/**
 * **Tabs** — dividers seen from above: a stepped row of tabs sitting on one
 * sheet, the open tab lifted clear and merged into the sheet below it by
 * dropping its bottom border.
 *
 * The most conservative variation, and the one that survives a narrow
 * viewport: the tab strip scrolls sideways rather than reflowing.
 */
export default function TabBlades({
  blades,
  initialIndex = 0,
  openOnHover = false,
}: BladesProps) {
  const [active, setActive] = useState(initialIndex);
  const id = useId();
  const current = blades[active];

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative z-10 flex items-end overflow-x-auto">
        {blades.map((blade, index) => {
          const open = index === active;
          const accent = accentOf(blade.accent);

          return (
            <button
              key={blade.id}
              type="button"
              role="tab"
              aria-selected={open}
              aria-controls={`${id}-panel`}
              onClick={() => setActive(index)}
              onFocus={openOnHover ? () => setActive(index) : undefined}
              onMouseEnter={openOnHover ? () => setActive(index) : undefined}
              className={`-ml-0.5 shrink-0 border-2 px-4 font-mono text-xs font-bold uppercase tracking-widest transition-all duration-200 first:ml-0 ${
                open
                  ? `translate-y-0.5 border-white border-b-zinc-900 bg-zinc-900 py-3 ${accent.text}`
                  : 'border-white bg-black py-2 text-zinc-400 hover:text-white'
              }`}
            >
              {/* A tab is a blade seen end-on, so it keeps the accent edge. */}
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`inline-block h-2 w-2 ${accent.bar} ${open ? 'opacity-100' : 'opacity-50'}`}
                />
                {blade.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`${id}-panel`}
        role="tabpanel"
        className="-mt-0.5 min-h-0 flex-1 border-2 border-white bg-zinc-900"
      >
        {current ? <BladeBody blade={current} /> : null}
      </div>
    </div>
  );
}
