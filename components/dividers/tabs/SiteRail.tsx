import { useRouter } from 'next/router';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import Link from '@/components/Link';
import { accentOf } from '../dividerAccents';
import type { Divider, SiteRailProps } from '../types';
import TabLabel from './TabLabel';

/**
 * **SiteRail** — the proposal, as one component: a column of vertical section
 * tabs tight to the left edge, and beside it a second, narrower rail that
 * always shows the open section's pages. The page starts immediately to the
 * right of both and never moves.
 *
 * It is the merge of two earlier treatments. *Shell* put everything the header
 * carried on one 3rem rail and slid a panel out over the page — which made
 * every navigation two clicks and a scrim. *Nested* kept the second level
 * permanently visible but had no idea where the reader was. This keeps
 * Nested's geometry and adds the location, so every destination is one click
 * and the rail can answer "where am I?" as well as "where can I go?".
 *
 * ## Two states, two devices
 *
 * A rail can be *open* on a section the reader is only looking at, so "open"
 * and "here" are different states and must not share a device:
 *
 * - **Here** — the section containing the current path, and the page itself
 *   on the inner rail — is the accent **fill**, so the section and the page
 *   share one colour.
 * - **Open but elsewhere** — the section whose pages the inner rail is
 *   showing — is a 4px accent **edge** and full-strength text. Choosing a tab
 *   never navigates; the links do.
 *
 * Both survive the paper remap; a surface pair would not (see
 * `dividerAccents.ts`).
 *
 * ## Semantics
 *
 * The section tabs are a vertical `tablist` with roving focus — up/down,
 * Home/End — and the inner rail is its `tabpanel`, holding a `<nav>` of real
 * links. `aria-current="location"` marks the section the reader is in and
 * `aria-current="page"` the page, independently of which tab is selected.
 *
 * ## Not yet
 *
 * This is still the desktop shape in a sandbox frame. Before it replaces the
 * header: the rail needs to be fixed to the viewport and the reading column
 * re-centred against the remaining width; below `lg` the burger drawer stays;
 * `SearchButton` and `ThemeSwitch` need rail-sized forms; and the whole thing
 * needs a pass onto the package's `--ds-*` roles.
 */
export default function SiteRail({
  dividers,
  currentPath,
  controls,
  children,
  className = '',
}: SiteRailProps) {
  const router = useRouter();
  const path = currentPath ?? router?.asPath ?? '/';
  const located = locateDivider(dividers, path);

  // The section whose pages the inner rail shows. It follows the location
  // whenever the location changes, and the reader can move it without going
  // anywhere.
  const [open, setOpen] = useState(located === -1 ? 0 : located);
  useEffect(() => {
    if (located !== -1) setOpen(located);
  }, [located]);

  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = dividers[open];
  const currentAccent = current ? accentOf(current.accent) : null;

  const onKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const last = dividers.length - 1;
    const next =
      event.key === 'ArrowDown'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowUp'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;

    if (next === null) return;
    event.preventDefault();
    setOpen(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      className={`relative flex h-full w-full overflow-hidden border-2 border-white bg-black ${className}`}
    >
      {/* Outer rail: wordmark, sections, controls. */}
      <div className="flex w-12 shrink-0 flex-col border-r-2 border-white bg-black">
        <div className="flex justify-center border-b-2 border-white py-3">
          <Link href="/" aria-label="Ryan Kelly Blog">
            <TabLabel className="tracking-[0.2em] text-white transition-colors hover:text-brutalist-cyan">
              RYAN_KELLY.DEV
            </TabLabel>
          </Link>
        </div>

        {/* A rail that scrolls must hide its scrollbar: a classic scrollbar is
            ~15px, a third of this rail, and pushes the labels off their tabs. */}
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="Site sections"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {dividers.map((divider, index) => {
            const isOpen = index === open;
            const isHere = index === located;
            const accent = accentOf(divider.accent);

            return (
              <button
                key={divider.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`${id}-tab-${divider.id}`}
                aria-selected={isOpen}
                aria-controls={`${id}-pages`}
                aria-current={isHere ? 'location' : undefined}
                tabIndex={isOpen ? 0 : -1}
                onClick={() => setOpen(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={`relative flex shrink-0 items-center justify-center border-l-4 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${
                  isHere
                    ? `border-l-transparent font-bold ${accent.fill}`
                    : isOpen
                      ? `${accent.edge} bg-zinc-900 text-white`
                      : 'border-l-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <TabLabel className="text-[0.7rem]">{divider.label}</TabLabel>
              </button>
            );
          })}
        </div>

        {controls ? (
          <div className="flex flex-col items-center gap-3 border-t-2 border-white py-3">
            {controls}
          </div>
        ) : null}
      </div>

      {/* Inner rail: the open section's pages, always visible. */}
      <div
        id={`${id}-pages`}
        role="tabpanel"
        aria-labelledby={current ? `${id}-tab-${current.id}` : undefined}
        className="flex w-9 shrink-0 flex-col border-r-2 border-white bg-zinc-900"
      >
        {current && currentAccent ? (
          <nav aria-label={`${current.label} pages`} className="flex flex-col">
            {current.items.map((item) => {
              const isHere = isCurrent(item.href, path);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isHere ? 'page' : undefined}
                  className={`flex items-center justify-center border-b-2 border-white py-3 transition-colors last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white ${
                    isHere
                      ? `font-bold ${currentAccent.fill}`
                      : `text-zinc-400 hover:text-white ${currentAccent.hover}`
                  }`}
                >
                  <TabLabel className="text-[0.65rem] tracking-[0.1em]">
                    {item.label}
                  </TabLabel>
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      {/* The page. It starts at the rail and is never pushed by it. */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Whether `href` is the page at `path`, or an ancestor of it. */
function isCurrent(href: string, path: string): boolean {
  const clean = path.split(/[?#]/)[0] ?? path;
  return clean === href || clean.startsWith(`${href}/`);
}

/**
 * Which divider `path` belongs to, or -1. Prefers the longest matching href so
 * `/design-sandbox/…` lands on IDEAS even though `/` would match everything.
 */
export function locateDivider(dividers: Divider[], path: string): number {
  let best = -1;
  let bestLength = -1;
  dividers.forEach((divider, index) => {
    for (const item of divider.items) {
      if (isCurrent(item.href, path) && item.href.length > bestLength) {
        best = index;
        bestLength = item.href.length;
      }
    }
  });
  return best;
}
