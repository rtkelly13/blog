import { Contrast, Search } from 'lucide-react';
import { useId, useState } from 'react';
import DividerBody from '../DividerBody';
import { accentOf } from '../dividerAccents';
import type { DividerSetProps } from '../types';
import TabLabel from './TabLabel';

/**
 * **Shell** — the proposal as a page, not as a specimen: no header bar at all.
 * The rail is tight to the left edge and carries everything the header used
 * to, top to bottom — wordmark, sections, then search and the theme switch
 * pinned to the bottom. The reading column starts immediately to its right and
 * never moves; choosing a section slides a panel out over the page, and
 * choosing it again shuts it.
 *
 * Worth reading against the top bar it replaces: the rail costs ~3rem of
 * width, which a 5xl reading column can spare, and buys back the whole vertical
 * band a sticky header takes out of every screenful.
 */
export default function TabbedShell({
  dividers,
  initialIndex = 0,
}: DividerSetProps) {
  const [active, setActive] = useState<number | null>(initialIndex);
  const id = useId();

  const current = active === null ? null : dividers[active];

  return (
    <div className="relative flex h-full w-full overflow-hidden border-2 border-white bg-black">
      <div className="flex w-[3rem] shrink-0 flex-col border-r-2 border-white bg-black">
        <div className="flex justify-center border-b-2 border-white py-4">
          <TabLabel className="tracking-[0.25em] text-white">RK.DEV</TabLabel>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                className={`relative flex shrink-0 items-center justify-center py-3 transition-colors ${
                  open
                    ? accent.fill
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-1 ${accent.bar} ${
                    open ? 'opacity-0' : 'opacity-50'
                  }`}
                />
                <TabLabel className="text-[0.7rem]">{divider.label}</TabLabel>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-3 border-t-2 border-white py-3">
          <Search className="h-4 w-4 text-brutalist-cyan" />
          <Contrast className="h-4 w-4 text-zinc-400" />
        </div>
      </div>

      {/* The page. It is inert here — the point is that it starts at the rail
          and is never pushed by it. */}
      <div className="min-w-0 flex-1 space-y-3 p-6">
        <p className="font-display text-xl font-bold uppercase text-white">
          [ A POST ]
        </p>
        <p className="font-mono text-xs text-zinc-500">
          2026-09-03 &middot; 8 min read &middot; no header above it
        </p>
        <div className="space-y-2 pt-2" aria-hidden>
          {[100, 96, 88, 99, 72, 94, 90, 64].map((width, index) => (
            <div
              key={index}
              style={{ width: `${width}%` }}
              className="h-2 bg-zinc-800"
            />
          ))}
        </div>
      </div>

      {/* The page recedes behind an open panel rather than being pushed by
          it. `bg-black` at 60% fades toward whatever the ground is, so it
          darkens on the terminal and lightens on paper — the same trick the
          folded blades use, and the reason no theme branch is needed. */}
      <button
        type="button"
        aria-label="Close section"
        tabIndex={current ? 0 : -1}
        onClick={() => setActive(null)}
        className={`absolute inset-y-0 right-0 left-[3rem] bg-black transition-opacity duration-300 ${
          current ? 'opacity-60' : 'pointer-events-none opacity-0'
        }`}
      />

      <div
        id={`${id}-panel`}
        style={{
          // The panel is offset from the left by the rail's own width, so
          // hiding it takes 100% of itself *plus* that offset — a bare -110%
          // parks its right edge back on top of the rail and eats half the
          // tabs' labels.
          transform: current ? 'none' : 'translateX(calc(-100% - 3.5rem))',
        }}
        className="absolute inset-y-0 left-[3rem] z-10 w-[15rem] max-w-[62%] border-r-2 border-white bg-zinc-900 transition-transform duration-300 ease-out"
      >
        {current ? <DividerBody divider={current} /> : null}
      </div>
    </div>
  );
}
