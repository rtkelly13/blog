import { useState } from 'react';
import headerNavLinks from '@/data/headerNavLinks';
import Link from './Link';

const MobileNav = () => {
  const [navShow, setNavShow] = useState(false);

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

  return (
    <div className="sm:hidden">
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
      <div
        className={`fixed w-full h-full top-24 right-0 bg-black/95 backdrop-blur border-l border-gray-800 z-10 transform ease-in-out duration-300 ${
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
            <div
              key={link.title}
              className="px-12 py-4 border-b border-gray-800"
            >
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
    </div>
  );
};

export default MobileNav;
