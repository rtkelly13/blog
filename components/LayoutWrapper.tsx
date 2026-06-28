import type { ReactNode } from 'react';
import headerNavLinks from '@/data/headerNavLinks';
import siteMetadata from '@/data/siteMetadata';
import Footer from './Footer';
import Link from './Link';
import MobileNav from './MobileNav';
import SectionContainer from './SectionContainer';
import SearchButton from './search/SearchButton';

interface Props {
  children: ReactNode;
}

const LayoutWrapper = ({ children }: Props) => {
  return (
    <SectionContainer>
      <div
        className="flex flex-col justify-between min-h-screen bg-black"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 255, 0, 0.03) 1px, transparent 1px)`,
          backgroundSize: '100% 4px',
        }}
      >
        <header
          className={`flex items-center justify-between py-6 px-4 border-b border-gray-800 ${
            siteMetadata.stickyNav
              ? 'sticky top-0 z-50 bg-black/90 backdrop-blur'
              : ''
          } text-white`}
        >
          <div>
            <Link href="/" aria-label="Ryan Kelly Blog">
              <div className="flex items-center gap-4">
                <div className="font-pixel text-4xl leading-none text-white hover:text-brutalist-neonGreen transition-colors drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                  RK
                </div>
                <span className="font-bold font-mono text-xl tracking-widest hidden md:block mt-1">
                  RYAN_KELLY.DEV
                </span>
              </div>
            </Link>
          </div>
          <div className="flex items-center text-base leading-5 gap-4">
            <div className="hidden sm:block">
              {headerNavLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className="p-1 font-mono font-bold sm:p-4 text-white hover:text-brutalist-cyan transition-colors uppercase"
                >
                  [ {link.title} ]
                </Link>
              ))}
            </div>
            <SearchButton />
            <MobileNav />
          </div>
        </header>
        <main className="mb-auto relative z-10">{children}</main>
        <Footer />
      </div>
    </SectionContainer>
  );
};

export default LayoutWrapper;
