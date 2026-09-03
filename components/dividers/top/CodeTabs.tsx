import {
  Children,
  isValidElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useId,
  useRef,
} from 'react';
import type { DividerAccentClasses } from '../dividerAccents';
import { accentOf } from '../dividerAccents';
import type { DividerAccent } from '../types';
import { useTabGroup } from './codeTabsStore';

/**
 * **Code tabs** — the top-aligned family, and deliberately a *different
 * mechanism* from the left-hand notebook rail.
 *
 * The rail is navigation: disclosure buttons that announce `aria-expanded`,
 * one section open, links inside. This is a **content switcher**: a real
 * `tablist` with roving focus, arrow-key traversal, and one panel of the same
 * content in a different form. Same design language, different contract —
 * which is why they are separate components rather than one with an
 * `orientation` prop.
 *
 * Usage in MDX. Blank lines around the fences are required: MDX only parses
 * markdown inside a JSX block when the block is opened and closed on its own
 * lines.
 *
 * ```mdx
 * <CodeTabs group="pkg">
 *   <CodeTab label="pnpm">
 *
 *     ```bash
 *     pnpm add @rtkelly13/design-system
 *     ```
 *
 *   </CodeTab>
 *   <CodeTab label="npm">
 *
 *     ```bash
 *     npm install @rtkelly13/design-system
 *     ```
 *
 *   </CodeTab>
 * </CodeTabs>
 * ```
 *
 * `group` is what makes it worth having: every block sharing a group switches
 * together and the choice is remembered across pages. Omit it for a one-off
 * block whose tabs mean nothing to the rest of the page.
 */
export type CodeTabsVariant = 'merged' | 'underline' | 'segmented';

export default function CodeTabs({
  children,
  group,
  variant = 'merged',
  accent = 'cyan',
  label,
}: {
  children: ReactNode;
  /** Blocks sharing a group switch together, and the choice persists. */
  group?: string;
  variant?: CodeTabsVariant;
  accent?: DividerAccent;
  /** Left-hand caption for the `segmented` variant — a filename or a title. */
  label?: string;
}) {
  const id = useId();
  const tone = accentOf(accent);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const tabs = Children.toArray(children)
    .filter(isValidElement)
    .map((child, index) => ({
      label:
        String((child.props as { label?: string }).label ?? '') ||
        `Tab ${index + 1}`,
      node: child,
    }));

  const [selected, select] = useTabGroup(group, tabs[0]?.label ?? '');

  // A group can be shared by blocks with different tab sets — `pnpm | npm` in
  // one and `pnpm | npm | yarn` in another. Fall back rather than showing an
  // empty block when the group's choice is not on offer here.
  const activeLabel = tabs.some((tab) => tab.label === selected)
    ? selected
    : (tabs[0]?.label ?? '');

  const onKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const last = tabs.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
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
    const target = tabs[next];
    if (!target) return;
    select(target.label);
    tabRefs.current[next]?.focus();
  };

  const tabList = (
    <div
      role="tablist"
      aria-label={label ?? group ?? 'Code variants'}
      className="flex items-end gap-1"
    >
      {tabs.map((tab, index) => {
        const active = tab.label === activeLabel;

        return (
          <button
            key={tab.label}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-selected={active}
            aria-controls={`${id}-panel-${index}`}
            tabIndex={active ? 0 : -1}
            onClick={() => select(tab.label)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={tabClass(variant, active, tone)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="my-6">
      {/* Every variant pulls itself half a border down over the code block's
          own top rule, so the seam between strip and block is one 2px line
          rather than two stacked ones — and so the selected tab can sit on
          it. */}
      {variant === 'segmented' ? (
        <div className="relative z-10 -mb-0.5 flex items-center justify-between gap-4 border-2 border-white border-b-0 bg-zinc-900 px-3 py-2.5">
          <span className="truncate font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
            {label ?? group ?? 'source'}
          </span>
          <div className="shrink-0 border-2 border-white [&>[role=tablist]]:gap-0">
            {tabList}
          </div>
        </div>
      ) : (
        <div
          className={`relative z-10 -mb-0.5 overflow-x-auto border-2 border-white border-b-0 ${
            variant === 'merged'
              ? 'bg-zinc-900 px-1.5 pt-1.5'
              : 'bg-black px-3 pt-2'
          }`}
        >
          {tabList}
        </div>
      )}

      {tabs.map((tab, index) => (
        <div
          key={tab.label}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={tab.label !== activeLabel}
          // The panels stay in the document rather than being unmounted, so
          // every variant of a snippet is still in the HTML for a crawler and
          // a switch costs no re-highlight.
          className="[&>div]:mt-0"
        >
          {tab.node}
        </div>
      ))}
    </div>
  );
}

/**
 * Three looks, at three volumes. Each marks the selected tab with `fill` or
 * `edge` plus a weight change — never with a surface swap, which is a 3%
 * lightness difference on paper and tells a reader nothing. See the state rule
 * in `dividerAccents.ts`.
 */
function tabClass(
  variant: CodeTabsVariant,
  active: boolean,
  tone: DividerAccentClasses,
): string {
  const base =
    'shrink-0 whitespace-nowrap font-mono text-xs font-bold uppercase tracking-widest transition-colors';

  if (variant === 'segmented') {
    // Loud, in a box: the chosen segment is a solid block of accent inside a
    // bordered control, so the control reads as a switch rather than a label.
    return `${base} border-white border-r-2 px-4 py-2 last:border-r-0 ${
      active ? tone.fill : 'bg-black text-zinc-500 hover:text-white'
    }`;
  }

  if (variant === 'underline') {
    // The quiet one: no tab shapes, a 4px accent rule on the seam, and the
    // label goes from muted to full-strength white.
    return `${base} border-b-4 px-4 py-2.5 ${
      active
        ? `${tone.edge} text-white`
        : 'border-b-transparent text-zinc-500 hover:text-white'
    }`;
  }

  // merged, the default and the loudest: a solid accent tab standing on the
  // code block, its bottom rule dropped so the fill runs into the block.
  return `${base} border-2 px-4 py-2 ${
    active
      ? `relative z-10 border-white border-b-0 ${tone.fill}`
      : 'border-transparent text-zinc-500 hover:border-white hover:text-white'
  }`;
}
