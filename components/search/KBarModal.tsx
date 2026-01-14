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
      <KBarPositioner className="z-50 bg-gray-300/50 p-4 backdrop-blur-xs dark:bg-black/50">
        <KBarAnimator className="w-full max-w-xl">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center space-x-4 p-4">
              <span className="block w-5">
                <svg
                  className="text-gray-400 dark:text-gray-300"
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
                defaultPlaceholder="Search..."
                className="h-8 w-full bg-transparent text-gray-600 placeholder-gray-400 focus:outline-hidden dark:text-gray-200 dark:placeholder-gray-500"
              />
              <kbd className="inline-block whitespace-nowrap rounded-sm border border-gray-400 px-1.5 align-middle text-xs font-medium leading-4 tracking-wide text-gray-400">
                ESC
              </kbd>
            </div>
            {!isLoading && <RenderResults />}
            {isLoading && (
              <div className="block border-t border-gray-100 px-4 py-6 text-center text-gray-400 dark:border-gray-800">
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
      <div className="block border-t border-gray-100 px-4 py-6 text-center text-gray-400 dark:border-gray-800">
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
            <div className="block border-t border-gray-100 px-4 pb-2 pt-6 text-xs font-semibold uppercase text-primary-600 dark:border-gray-800">
              {item}
            </div>
          ) : (
            <div
              className={`flex cursor-pointer justify-between px-4 py-2 ${
                active
                  ? 'bg-primary-600 text-gray-100'
                  : 'bg-transparent text-gray-700 dark:text-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{item.name}</span>
                {item.subtitle && (
                  <span className="text-xs text-gray-400">{item.subtitle}</span>
                )}
              </div>
              {item.shortcut?.length && (
                <div className="flex gap-1">
                  {item.shortcut.map((sc) => (
                    <kbd
                      key={sc}
                      className={`flex h-6 w-6 items-center justify-center rounded-sm border text-xs font-medium ${
                        active
                          ? 'border-gray-200 text-gray-200'
                          : 'border-gray-400 text-gray-400'
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
