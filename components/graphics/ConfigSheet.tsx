import { X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * A bottom sheet with a modal's semantics.
 *
 * ## Why not a modal
 *
 * The obvious component here is a centred dialog, and the design system exports
 * one. It is the wrong shape for this job: a centred modal covers the thing
 * being configured, so every slider drag is made blind. The sheet caps at 62vh
 * precisely so the graphic stays visible above it while you work.
 *
 * ## Why a modal anyway
 *
 * That is an argument about *layout*, and it was doing double duty as an excuse
 * to hand-roll the rest. A panel that covers the page and traps interaction is
 * a dialog whatever shape it is, and the first version of this had none of what
 * that implies: no `role`, no focus trap, no Escape, no focus restore, and
 * background content still reachable by Tab and still scrollable behind it.
 *
 * So this takes the modal's semantics and keeps the sheet's placement:
 *
 * - `role="dialog"` and `aria-modal`, labelled by its own heading
 * - focus moves in on open and returns to the opener on close, because a
 *   keyboard user who dismisses a dialog and lands back at the top of the
 *   document has effectively been thrown out of the page
 * - Tab cycles within the sheet
 * - Escape closes, which is the one shortcut every dialog is assumed to have
 * - the body does not scroll underneath
 *
 * ## Why it is portalled
 *
 * `LayoutWrapper` gives `<main>` a `relative z-10` and the footer is a later
 * sibling at the same level, so an overlay *inside* main is scoped to main's
 * stacking context and the footer paints straight through it — which it did,
 * across the controls. No z-index fixes that from the inside.
 *
 * ## Where this should end up
 *
 * In the design system, as a `placement` variant on `Modal`, per ADR 0009 —
 * a dialog that can open from an edge is plainly reusable, and a product will
 * want one. It is here for now because that is a cross-repo release and this
 * was a live accessibility defect.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function ConfigSheet({ open, onClose, title, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const headingId = useId();

  const focusables = useCallback(
    () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute('disabled')),
    [],
  );

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    // Focus the panel itself rather than the first control: landing on a slider
    // means the first arrow key silently changes a value.
    panel.current?.focus();

    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose, focusables]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end lg:hidden">
      {/* The scrim stops at the sheet, so the top of the subject stays visible
          and adjustments are not made blind. */}
      <button
        type="button"
        aria-label="Close controls"
        tabIndex={-1}
        onClick={onClose}
        className="flex-1 bg-black/50"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="max-h-[62vh] overflow-y-auto border-t-2 border-white bg-black outline-none"
      >
        <div className="sticky top-0 flex items-center justify-between border-b-2 border-zinc-800 bg-black px-4 py-3">
          <span
            id={headingId}
            className="font-display text-sm font-bold uppercase text-white"
          >
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close controls"
            className="border-2 border-zinc-700 p-1.5 text-zinc-400 hover:border-brutalist-cyan hover:text-brutalist-cyan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
