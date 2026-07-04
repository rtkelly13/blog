import type { Action } from 'kbar';
import {
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarResults,
  KBarSearch,
  useMatches,
  useRegisterActions,
} from 'kbar';

interface Props {
  actions: Action[];
  isLoading: boolean;
}

export default function KBarModal({ actions, isLoading }: Props) {
  useRegisterActions(actions, [actions]);

  return (
    <KBarPortal>
      <KBarPositioner className="z-50 bg-black/80 p-4 backdrop-blur-sm">
        <KBarAnimator className="w-full max-w-xl">
          <div className="overflow-hidden border-2 border-brutalist-cyan shadow-glow-cyan bg-black font-mono">
            <div className="flex items-center space-x-4 p-4 border-b-2 border-brutalist-cyan">
              <span className="block w-5 text-brutalist-cyan font-bold text-xl">
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
            {!isLoading && <RenderResults />}
            {isLoading && (
              <div className="block px-4 py-6 text-center text-brutalist-cyan animate-pulse">
                [ LOADING_DATA... ]
              </div>
            )}
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
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
    <KBarResults
      items={results}
      onRender={({ item, active }) => (
        <div>
          {typeof item === 'string' ? (
            <div className="block px-4 pb-2 pt-6 text-xs font-bold uppercase text-brutalist-cyberOrange tracking-widest border-t-2 border-zinc-800 mt-2">
              {'// '}
              {item}
            </div>
          ) : (
            <div
              className={`flex cursor-pointer justify-between px-4 py-3 border-l-4 transition-colors ${
                active
                  ? 'bg-brutalist-cyan/20 text-brutalist-cyan border-brutalist-cyan'
                  : 'bg-transparent text-zinc-300 border-transparent hover:bg-zinc-900'
              }`}
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-bold">{item.name}</span>
                {item.subtitle && (
                  <span className="line-clamp-2 text-xs text-zinc-500">
                    {item.subtitle}
                  </span>
                )}
              </div>
              {item.shortcut?.length && (
                <div className="flex gap-1 items-center">
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
              )}
            </div>
          )}
        </div>
      )}
    />
  );
}
