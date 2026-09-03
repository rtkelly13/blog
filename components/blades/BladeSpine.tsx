import { accentOf } from './bladeAccents';
import type { Blade } from './types';

/**
 * A blade's spine: the sliver that stays visible when the blade is shut. The
 * label runs bottom-to-top (`vertical-rl` + a half turn) so a column of them
 * reads like the tabs on a filing box or the edge-on blades of a stacked
 * dashboard.
 */
export default function BladeSpine({
  blade,
  open,
  orientation = 'vertical',
  width = 'narrow',
  onOpen,
  onHover,
  controls,
}: {
  blade: Blade;
  open: boolean;
  orientation?: 'vertical' | 'horizontal';
  /**
   * How much room the spine takes when shut. `wide` exists for FoldBlades,
   * where the spine is seen at 60° and so projects to half its real width.
   */
  width?: 'narrow' | 'wide';
  onOpen: () => void;
  onHover?: () => void;
  controls?: string;
}) {
  const accent = accentOf(blade.accent);

  return (
    <button
      type="button"
      onClick={onOpen}
      onFocus={onHover}
      onMouseEnter={onHover}
      aria-expanded={open}
      aria-controls={controls}
      className={`group flex shrink-0 items-center justify-center gap-2 transition-colors ${
        orientation === 'vertical'
          ? width === 'wide'
            ? 'h-full w-[5.5rem]'
            : 'h-full w-[3.25rem]'
          : 'h-11 w-full px-4'
      } ${open ? 'bg-zinc-900' : 'bg-black hover:bg-zinc-900'}`}
    >
      <span
        className={`font-mono text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
          orientation === 'vertical'
            ? '[writing-mode:vertical-rl] rotate-180'
            : ''
        } ${open ? accent.text : 'text-zinc-400 group-hover:text-white'}`}
      >
        {blade.label}
      </span>
    </button>
  );
}
