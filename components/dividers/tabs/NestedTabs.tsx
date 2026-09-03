import { useId, useState } from 'react';
import Link from '@/components/Link';
import { accentOf } from '../dividerAccents';
import type { DividerSetProps } from '../types';
import TabLabel from './TabLabel';

/**
 * **Nested** — two levels of tab, both vertical, both on the left. Sections on
 * the outer rail; the open section's destinations on a second, narrower rail
 * immediately inside it; the page to the right of both.
 *
 * This is the variation that actually replaces a header *and* its dropdowns.
 * A header bar has to hide the second level behind a hover menu because it has
 * no room; a left rail has the whole height of the screen, so the second level
 * is simply always there.
 */
export default function NestedTabs({
  dividers,
  initialIndex = 0,
}: DividerSetProps) {
  const [active, setActive] = useState(initialIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const id = useId();

  const current = dividers[active];
  const items = current?.items ?? [];
  // The item index belongs to the previous section until it is re-chosen, so
  // clamp rather than trusting it across a section change.
  const item = items[Math.min(itemIndex, items.length - 1)];
  const accent = accentOf(current?.accent ?? 'white');

  return (
    <div className="flex h-full w-full overflow-hidden border-2 border-white bg-black">
      <div className="flex w-[2.75rem] shrink-0 flex-col border-r-2 border-white">
        {dividers.map((divider, index) => {
          const open = index === active;
          const tabAccent = accentOf(divider.accent);

          return (
            <button
              key={divider.id}
              type="button"
              aria-expanded={open}
              aria-controls={`${id}-sub`}
              onClick={() => {
                setActive(index);
                setItemIndex(0);
              }}
              className={`flex flex-1 items-center justify-center border-white border-b-2 transition-colors last:border-b-0 ${
                open
                  ? tabAccent.fill
                  : 'bg-black text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <TabLabel>{divider.label}</TabLabel>
            </button>
          );
        })}
      </div>

      <div
        id={`${id}-sub`}
        className="flex w-[2.25rem] shrink-0 flex-col border-r-2 border-white bg-zinc-900"
      >
        {items.map((entry, index) => {
          const on = entry === item;

          return (
            <button
              key={entry.href}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => setItemIndex(index)}
              className={`flex flex-1 items-center justify-center border-white border-b-2 transition-colors last:border-b-0 ${
                on
                  ? `bg-black ${accent.text}`
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TabLabel className="text-[0.65rem]">{entry.label}</TabLabel>
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 bg-black p-5">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-zinc-500">
          {current?.label} <span className={accent.text}>/</span> {item?.label}
        </p>
        <p className="font-display text-xl font-bold uppercase text-white">
          [ {item?.label} ]
        </p>
        <p className="font-mono text-xs leading-relaxed text-zinc-400">
          <span className={accent.text}>&gt;</span> {current?.hint}
        </p>
        {item ? (
          <Link
            href={item.href}
            className={`mt-1 w-fit border-2 border-white px-3 py-1.5 font-mono text-xs font-bold text-white transition-colors ${accent.hover}`}
          >
            {item.href}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
