import { type RefObject, useEffect, useRef } from 'react';

interface UseDrawerOptions {
  /** Whether the drawer is currently shown. */
  open: boolean;
  /** Called when the drawer should close (currently: Escape). */
  onClose: () => void;
  /** The sliding panel. Needs `tabIndex={-1}` so it can take focus. */
  panelRef: RefObject<HTMLElement | null>;
  /** The control that opened the drawer, to hand focus back to. */
  triggerRef: RefObject<HTMLElement | null>;
}

/**
 * Keyboard and focus behaviour shared by the site's off-canvas drawers (the
 * mobile nav, the post table of contents):
 *
 * - Escape closes, which is the shortcut anyone who has met a drawer will try.
 * - Focus moves into the panel when it opens and back to the trigger when it
 *   closes, so a keyboard user is never left on a control that has slid off
 *   screen, or stranded at the end of the document.
 *
 * Deliberately *not* a focus trap, and the drawers deliberately do not claim
 * `role="dialog"` / `aria-modal`. The site header stays visible and clickable
 * alongside the mobile drawer by design, so trapping focus would lie about the
 * drawer's modality and fight the header's own controls. Pair this with
 * `inert` on the closed panel — that, not a trap, is what keeps a shut drawer
 * out of the tab order.
 */
export function useDrawer({
  open,
  onClose,
  panelRef,
  triggerRef,
}: UseDrawerOptions) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Only pull focus back on a genuine open → closed transition, so the first
  // render does not steal focus from wherever the page put it.
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    } else if (wasOpen.current) {
      triggerRef.current?.focus();
    }

    wasOpen.current = open;
  }, [open, panelRef, triggerRef]);
}
