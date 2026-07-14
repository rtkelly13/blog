import type { ReactNode } from 'react';
import headerNavLinks from '@/data/headerNavLinks';
import siteMetadata from '@/data/siteMetadata';
import Footer from './Footer';
import { PAPER_ACCENTS } from './graphics/palette';
import { graphicDataUri } from './graphics/registry';
import Link from './Link';
import MobileNav from './MobileNav';
import SectionContainer from './SectionContainer';
import SearchButton from './search/SearchButton';
import ThemeSwitch from './ThemeSwitch';

interface Props {
  children: ReactNode;
}

// Paper texture for the light `sketch` theme: a faint ink graph-paper dot-grid
// straight from the site's own generator (deterministic ⇒ identical SSR/CSR).
// Exposed as `--page-texture` scoped to `.sketch` so the switch is pure CSS (no
// hydration flash); dark/dim fall back to the green scanline.
const PAPER_TEXTURE = graphicDataUri('dot-grid', {
  width: 480,
  height: 480,
  accent: PAPER_ACCENTS.ink,
  background: 'transparent',
  density: 0.32,
  opacity: 0.5,
});
const PAPER_TEXTURE_CSS = `.sketch{--page-texture:url("${PAPER_TEXTURE}");--page-texture-size:240px 240px;}`;

const LayoutWrapper = ({ children }: Props) => {
  return (
    <>
      {/* Static, generated CSS string (no user input) — safe inline style. */}
      <style dangerouslySetInnerHTML={{ __html: PAPER_TEXTURE_CSS }} />
      <div
        className="flex flex-col justify-between min-h-screen bg-black"
        style={{
          backgroundImage: `var(--page-texture, linear-gradient(var(--scanline-color, rgba(0, 255, 0, 0.03)) 1px, transparent 1px))`,
          backgroundSize: `var(--page-texture-size, 100% 4px)`,
        }}
      >
        {/* Full-viewport-width header: the reading column (max-w-5xl) is too
            narrow for the inline nav + wordmark + controls, so the header spans
            the whole width while the content below stays inset. */}
        <header
          className={`flex items-center justify-between border-b border-gray-800 px-4 py-6 sm:px-6 ${
            siteMetadata.stickyNav
              ? 'sticky top-0 z-50 bg-black/90 backdrop-blur'
              : ''
          } text-white`}
        >
          <div>
            <Link href="/" aria-label="Ryan Kelly Blog">
              <span className="block font-bold font-mono text-lg sm:text-xl tracking-widest text-white hover:text-brutalist-neonGreen transition-colors drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                RYAN_KELLY.DEV
              </span>
            </Link>
          </div>
          <div className="flex items-center text-base leading-5 gap-4">
            <div className="hidden lg:flex lg:items-center">
              {headerNavLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className="p-1 font-mono font-bold sm:px-3 whitespace-nowrap text-white hover:text-brutalist-cyan transition-colors uppercase"
                >
                  [ {link.title} ]
                </Link>
              ))}
            </div>
            <ThemeSwitch />
            <SearchButton />
            <MobileNav />
          </div>
        </header>
        <main className="mb-auto relative z-10">
          <SectionContainer>{children}</SectionContainer>
        </main>
        <SectionContainer>
          <Footer />
        </SectionContainer>
      </div>
    </>
  );
};

export default LayoutWrapper;
