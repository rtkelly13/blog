import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import headerNavLinks from '@/data/headerNavLinks';
import { useDrawer } from '@/lib/useDrawer';
import Link from './Link';

// Tailwind's `lg`, where the inline nav takes over and this drawer is hidden.
const LG = '(min-width: 64rem)';

const MobileNav = () => {
  const [navShow, setNavShow] = useState(false);
  // The drawer is portalled to <body>, so it can only render once there is a
  // document to portal into — server render and first hydration pass emit the
  // toggle button alone.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const closeNav = useCallback(() => setNavShow(false), []);
  const onToggleNav = useCallback(() => setNavShow((shown) => !shown), []);

  useDrawer({
    open: navShow,
    onClose: closeNav,
    panelRef,
    triggerRef: toggleRef,
  });

  // Scroll lock. Two fixes over what this used to be:
  //
  // 1. It locks <html>, not <body>. `document.scrollingElement` here is <html>
  //    (nothing constrains the body's height), so `overflow: hidden` on the
  //    body clipped a box that was not the scroller and the page scrolled
  //    behind the open drawer regardless. Locking the scrolling element
  //    actually holds, and leaves the sticky header pinned.
  // 2. It is an effect keyed on `navShow` rather than something the toggle
  //    handler does on the side, so the cleanup runs on close, on unmount and
  //    on the `lg` close below — the old version could leave `hidden` behind
  //    for good if the drawer was hidden by a resize instead of a click. The
  //    previous inline value is restored rather than hardcoded back to `auto`,
  //    so this does not clobber a lock someone else owns.
  useEffect(() => {
    if (!navShow) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [navShow]);

  // Growing past `lg` swaps this drawer for the inline nav, so close it —
  // otherwise it reopens mid-slide on the way back down, and used to take the
  // scroll lock with it for good.
  useEffect(() => {
    const lg = window.matchMedia(LG);
    const onChange = () => {
      if (lg.matches) closeNav();
    };

    onChange();
    lg.addEventListener('change', onChange);
    return () => lg.removeEventListener('change', onChange);
  }, [closeNav]);

  /*
   * Portalled to <body> rather than left inside the header, for two reasons
   * that both bit this drawer:
   *
   * 1. The sticky header carries `backdrop-blur`, and a non-`none`
   *    backdrop-filter makes an element the containing block for its
   *    `position: fixed` descendants. Nested in the header, the panel's
   *    percentage sizing resolved against the ~85px header instead of the
   *    viewport and collapsed to a thin band, so the links spilled out below
   *    it onto the page — a menu with no background behind it.
   * 2. The header is a `z-50` stacking context, so a positioned child painted
   *    over the wordmark and the theme / search / close controls. Covering the
   *    full viewport from inside the header dimmed them and swallowed their
   *    clicks.
   *
   * At body level the panel sizes against the viewport, and the header's own
   * `z-50` keeps it painted and clickable above the panel's `z-40`. `top-0
   * h-screen` then covers the viewport exactly — no sliver of page between the
   * header and the drawer at any header height — while `pt-24` pushes the link
   * list clear of the header. `lg:hidden` has to live on the panel itself now
   * that it no longer inherits it from the toggle's wrapper.
   *
   * `inert` while closed is what keeps the off-screen links out of the tab
   * order and the accessibility tree; `translate-x-full` only moves them out
   * of sight. `tabIndex={-1}` lets useDrawer hand focus to the panel on open.
   */
  const panel = (
    <div
      id="mobile-nav-panel"
      ref={panelRef}
      tabIndex={-1}
      inert={!navShow}
      className={`lg:hidden fixed w-full h-screen top-0 right-0 pt-24 bg-black/95 backdrop-blur border-l border-gray-800 z-40 transform ease-in-out duration-300 focus:outline-hidden ${
        navShow ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Click-away. A plain div, not a button: Escape closes the drawer now,
          so a full-panel focusable control with no visible label would just be
          a confusing extra tab stop. Mirrors the TOC drawer's backdrop. */}
      <div
        className="fixed w-full h-full cursor-auto"
        onClick={onToggleNav}
        aria-hidden="true"
      />
      <nav aria-label="Site" className="fixed h-full mt-8 w-full">
        {headerNavLinks.map((link) => (
          <div key={link.title} className="px-12 py-4 border-b border-gray-800">
            <Link
              href={link.href}
              className="text-2xl font-mono font-bold tracking-widest text-white hover:text-brutalist-neonGreen transition-colors uppercase"
              onClick={onToggleNav}
            >
              &gt; {link.title}
            </Link>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="lg:hidden">
      <button
        type="button"
        ref={toggleRef}
        className="w-8 h-8 ml-1 mr-1 text-white hover:text-brutalist-neonGreen transition-colors drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] hover:drop-shadow-[0_0_8px_rgba(57,255,20,0.8)]"
        aria-label="Toggle Menu"
        aria-expanded={navShow}
        aria-controls="mobile-nav-panel"
        onClick={onToggleNav}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="text-current w-6 h-6 m-auto"
        >
          {navShow ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 12h18M3 6h18M3 18h18"
            />
          )}
        </svg>
      </button>
      {mounted && createPortal(panel, document.body)}
    </div>
  );
};

export default MobileNav;
