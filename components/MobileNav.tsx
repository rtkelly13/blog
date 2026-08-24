import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import headerNavLinks from '@/data/headerNavLinks';
import Link from './Link';

const MobileNav = () => {
  const [navShow, setNavShow] = useState(false);
  // The drawer is portalled to <body>, so it can only render once there is a
  // document to portal into — server render and first hydration pass emit the
  // toggle button alone.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onToggleNav = () => {
    setNavShow((status) => {
      if (status) {
        document.body.style.overflow = 'auto';
      } else {
        document.body.style.overflow = 'hidden';
      }
      return !status;
    });
  };

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
   * Covered by tests/responsive.spec.ts → "mobile nav panel covers the
   * viewport behind its links" and "site header stays interactive".
   */
  const panel = (
    <div
      className={`lg:hidden fixed w-full h-screen top-0 right-0 pt-24 bg-black/95 backdrop-blur border-l border-gray-800 z-40 transform ease-in-out duration-300 ${
        navShow ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <button
        type="button"
        aria-label="toggle modal"
        className="fixed w-full h-full cursor-auto focus:outline-hidden"
        onClick={onToggleNav}
      ></button>
      <nav className="fixed h-full mt-8 w-full">
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
        className="w-8 h-8 ml-1 mr-1 text-white hover:text-brutalist-neonGreen transition-colors drop-shadow-[0_0_5px_rgba(255,255,255,0.3)] hover:drop-shadow-[0_0_8px_rgba(57,255,20,0.8)]"
        aria-label="Toggle Menu"
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
