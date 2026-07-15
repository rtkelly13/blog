import { useKBar } from 'kbar';

/**
 * Prominent command-palette trigger in the header. Reads as a search field
 * (icon + placeholder + ⌘K hint) rather than a bare icon, so the palette is
 * discoverable; collapses to just the icon on narrow screens. Opening it is
 * still also bound to ⌘K / Ctrl-K by kbar.
 */
export default function SearchButton() {
  const { query } = useKBar();

  return (
    <button
      type="button"
      aria-label="Search the site"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => query.toggle()}
      className="group ml-1 flex items-center gap-2 border-2 border-brutalist-cyan bg-black px-2 py-1.5 font-mono text-sm text-zinc-400 transition-all hover:text-white hover:shadow-glow-cyan sm:ml-4 sm:gap-3 sm:px-3"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-5 w-5 shrink-0 text-brutalist-cyan"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <span className="hidden whitespace-nowrap xl:inline">search_system…</span>
      <kbd className="ml-2 hidden whitespace-nowrap border-2 border-brutalist-pink bg-black px-1.5 py-0.5 text-xs font-bold uppercase leading-none tracking-wide text-brutalist-pink xl:inline-block">
        ⌘K
      </kbd>
    </button>
  );
}
