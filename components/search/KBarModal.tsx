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
          <div className="overflow-hidden border-2 border-white bg-black font-mono">
            <div className="flex items-center space-x-4 p-4 border-b-2 border-white">
              <span className="block w-5 text-brutalist-cyan">
                <svg
                  className="text-brutalist-cyan"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <KBarSearch
                defaultPlaceholder="> Search..."
                className="h-8 w-full bg-transparent text-white placeholder-zinc-500 focus:outline-hidden"
              />
              <kbd className="inline-block whitespace-nowrap border border-white px-1.5 align-middle text-xs font-medium leading-4 tracking-wide text-white bg-zinc-900">
                ESC
              </kbd>
            </div>
            {!isLoading && <RenderResults />}
            {isLoading && (
              <div className="block border-t-2 border-white px-4 py-6 text-center text-zinc-500">
                Loading...
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
      <div className="block border-t-2 border-white px-4 py-6 text-center text-zinc-500">
        No results found.
      </div>
    );
  }

  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) => (
        <div>
          {typeof item === 'string' ? (
            <div className="block border-t-2 border-white px-4 pb-2 pt-6 text-xs font-semibold uppercase text-brutalist-cyan">
              {item}
            </div>
          ) : (
            <div
              className={`flex cursor-pointer justify-between px-4 py-2 border-l-2 ${
                active
                  ? 'bg-brutalist-cyan text-black border-brutalist-cyan'
                  : 'bg-transparent text-white border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{item.name}</span>
                {item.subtitle && (
                  <span className="text-xs text-zinc-500">{item.subtitle}</span>
                )}
              </div>
              {item.shortcut?.length && (
                <div className="flex gap-1">
                  {item.shortcut.map((sc) => (
                    <kbd
                      key={sc}
                      className={`flex h-6 w-6 items-center justify-center border text-xs font-medium ${
                        active
                          ? 'border-black text-black'
                          : 'border-white text-white'
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
