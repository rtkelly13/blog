import { useId, useState } from 'react';
import DividerBody from '../DividerBody';
import { accentOf } from '../dividerAccents';
import type { DividerSetProps } from '../types';

/**
 * **Stack** — a sheaf of dividers laid one over the next, each shifted far
 * enough right that its edge ribbon stays visible and clickable. Choosing a
 * ribbon pulls that sheet to the front; the one it replaced goes to the back
 * of the stack rather than swapping places, so the order stays a cycle and
 * the motion always reads the same way.
 */
export default function StackBlades({
  dividers,
  initialIndex = 0,
}: DividerSetProps) {
  const [active, setActive] = useState(initialIndex);
  const id = useId();

  const count = dividers.length;
  const step = 1.9; // rem of exposed ribbon per sheet behind the front one
  const inset = (count - 1) * step;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black p-4">
      {dividers.map((divider, index) => {
        const depth = (index - active + count) % count;
        const open = depth === 0;
        const accent = accentOf(divider.accent);

        return (
          <div
            key={divider.id}
            style={{
              transform: `translateX(${depth * step}rem)`,
              width: `calc(100% - 2rem - ${inset}rem)`,
              zIndex: count - depth,
            }}
            className={`absolute inset-y-4 left-4 flex border-2 bg-zinc-900 transition-transform duration-[400ms] ease-out ${
              open ? accent.border : 'border-white'
            }`}
          >
            <div
              id={`${id}-${divider.id}`}
              className={`min-w-0 flex-1 overflow-hidden transition-opacity duration-300 ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <DividerBody divider={divider} />
            </div>

            {/* The ribbon is the only part of a buried sheet you can see, so
                it is also the only part you can click. */}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={`${id}-${divider.id}`}
              onClick={() => setActive(index)}
              style={{ width: `${step}rem` }}
              className={`flex shrink-0 items-center justify-center border-l-2 transition-colors ${
                open
                  ? `${accent.border} ${accent.fill}`
                  : 'border-white bg-black text-zinc-400 hover:text-white'
              }`}
            >
              <span className="[writing-mode:vertical-rl] rotate-180 font-mono text-[0.7rem] font-bold uppercase tracking-[0.2em]">
                {divider.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
