import { useId, useState } from 'react';
import BladeBody from './BladeBody';
import BladeSpine from './BladeSpine';
import { accentOf } from './bladeAccents';
import type { BladesProps } from './types';

/**
 * **Rail** — the literal blades read: full-height columns, each collapsed to
 * its spine until it is opened, at which point it takes the remaining width
 * and the rest compress back into a row of edges.
 *
 * The one that most nearly replaces a header outright: the whole navigation
 * is permanently on screen down the side of the page, and opening a section
 * costs no overlay, no dropdown and no layout shift for the content below.
 */
export default function RailBlades({
  blades,
  initialIndex = 0,
  openOnHover = true,
}: BladesProps) {
  const [active, setActive] = useState(initialIndex);
  const id = useId();

  return (
    <div className="flex h-full w-full overflow-hidden border-2 border-white bg-black">
      {blades.map((blade, index) => {
        const open = index === active;
        const accent = accentOf(blade.accent);

        return (
          <div
            key={blade.id}
            style={{
              flexGrow: open ? 1 : 0,
              flexShrink: open ? 1 : 0,
              flexBasis: '3.25rem',
            }}
            className={`relative flex min-w-0 border-r-2 border-white transition-[flex-grow] duration-500 ease-out last:border-r-0 ${
              open ? 'bg-zinc-900' : 'bg-black'
            }`}
          >
            {/* Leading edge: the accent bar is what turns a plain column into
                a blade — lit neon on the terminal, a pen rule on paper. */}
            <span
              aria-hidden
              className={`absolute inset-y-0 left-0 w-1 transition-opacity duration-500 ${accent.bar} ${
                open ? 'opacity-100' : 'opacity-40'
              }`}
            />

            <BladeSpine
              blade={blade}
              open={open}
              controls={`${id}-${blade.id}`}
              onOpen={() => setActive(index)}
              onHover={openOnHover ? () => setActive(index) : undefined}
            />

            <div
              id={`${id}-${blade.id}`}
              className={`min-w-0 flex-1 overflow-hidden transition-opacity duration-300 ${
                open ? 'opacity-100 delay-150' : 'pointer-events-none opacity-0'
              }`}
            >
              <div className="w-[16rem] max-w-full">
                <BladeBody blade={blade} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
