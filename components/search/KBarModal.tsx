import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarResults,
  KBarSearch,
  useMatches,
} from 'kbar';
import { HL } from './DeepSearch';

export default function KBarModal() {
  return (
    <KBarPortal>
      <KBarPositioner className="z-50 bg-black/80 p-4 backdrop-blur-sm">
        <KBarAnimator className="w-full max-w-xl">
          <div className="overflow-hidden border-2 border-brutalist-cyan shadow-glow-cyan bg-black font-mono">
            <div className="flex items-center space-x-4 p-4 border-b-2 border-brutalist-cyan">
              <span className="block w-5 animate-pulse text-brutalist-cyan font-bold text-xl">
                &gt;
              </span>
              <KBarSearch
                defaultPlaceholder="search_system...|"
                className="h-8 w-full bg-transparent text-white placeholder-zinc-500 focus:outline-hidden"
              />
              <kbd className="inline-block whitespace-nowrap border-2 border-brutalist-pink px-2 py-1 align-middle text-xs font-bold leading-4 tracking-wide text-brutalist-pink bg-black uppercase">
                ESC
              </kbd>
            </div>
            <RenderResults />
            <Footer />
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}

/** Short, colored type tag derived from a result's section. */
function badge(section: string): { label: string; className: string } | null {
  switch (section) {
    case 'Blog Posts':
      return {
        label: 'LOG',
        className: 'border-brutalist-cyan text-brutalist-cyan',
      };
    case 'Talks':
      return {
        label: 'TALK',
        className: 'border-brutalist-pink text-brutalist-pink',
      };
    case 'Navigation':
      return {
        label: 'NAV',
        className: 'border-brutalist-cyberOrange text-brutalist-cyberOrange',
      };
    default:
      return null;
  }
}

/** Render a snippet, turning {@link HL}-wrapped spans into highlighted marks. */
function Snippet({ text, active }: { text: string; active: boolean }) {
  const parts = text.split(HL);
  return (
    <span className="line-clamp-2 text-xs text-zinc-500">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className={`bg-transparent font-bold ${
              active ? 'text-brutalist-yellow' : 'text-brutalist-neonGreen'
            }`}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

function RenderResults() {
  const { results } = useMatches();

  if (results.length === 0) {
    return (
      <div className="block px-4 py-6 text-center text-brutalist-pink">
        [ ERROR: NO_RESULTS_FOUND ]
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
      <KBarResults
        items={results}
        onRender={({ item, active }) =>
          typeof item === 'string' ? (
            <div className="block px-4 pb-2 pt-6 text-xs font-bold uppercase text-brutalist-cyberOrange tracking-widest border-t-2 border-zinc-800 mt-2">
              {'// '}
              {item}
            </div>
          ) : (
            <div
              className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3 border-l-4 transition-colors ${
                active
                  ? 'bg-brutalist-cyan/20 text-brutalist-cyan border-brutalist-cyan'
                  : 'bg-transparent text-zinc-300 border-transparent hover:bg-zinc-900'
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                {(() => {
                  const b = badge(
                    typeof item.section === 'string'
                      ? item.section
                      : (item.section?.name ?? ''),
                  );
                  return b ? (
                    <span
                      className={`mt-0.5 shrink-0 border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider ${b.className}`}
                    >
                      {b.label}
                    </span>
                  ) : null;
                })()}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold">{item.name}</span>
                  {item.subtitle && (
                    <Snippet text={item.subtitle} active={active} />
                  )}
                </div>
              </div>
              {item.shortcut?.length ? (
                <div className="flex shrink-0 items-center gap-1">
                  {item.shortcut.map((sc) => (
                    <kbd
                      key={sc}
                      className={`flex h-6 w-6 items-center justify-center border-2 text-xs font-bold ${
                        active
                          ? 'border-brutalist-cyan text-brutalist-cyan'
                          : 'border-zinc-500 text-zinc-500'
                      }`}
                    >
                      {sc}
                    </kbd>
                  ))}
                </div>
              ) : null}
            </div>
          )
        }
      />
    </div>
  );
}

/** Terminal-style key legend pinned under the results. */
function Footer() {
  return (
    <div className="flex items-center gap-4 border-t-2 border-zinc-800 px-4 py-2 text-[10px] uppercase tracking-widest text-zinc-600">
      <span>
        <span className="text-brutalist-cyan">↑↓</span> navigate
      </span>
      <span>
        <span className="text-brutalist-cyan">↵</span> open
      </span>
      <span className="ml-auto text-zinc-700">full-body search</span>
    </div>
  );
}
