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
      <div className="flex flex-col justify-between min-h-screen bg-black">
        <header
          className={`flex items-center justify-between py-6 px-4 border-b-2 border-white ${
            siteMetadata.stickyNav ? 'sticky top-0 z-50 bg-black' : ''
          } text-white`}
        >
          <div>
            <Link href="/" aria-label="Ryan Kelly Blog">
              <div className="flex items-center gap-3">
                <pre className="font-mono text-[8px] leading-none text-white hover:text-brutalist-pink transition-colors hidden sm:block">
                  {`██████╗ ██╗  ██╗
██╔══██╗██║ ██╔╝
██████╔╝█████╔╝ 
██╔══██╗██╔═██╗ 
██║  ██║██║  ██╗
╚═╝  ╚═╝╚═╝  ╚═╝`}
                </pre>
                <div className="bg-white text-black font-bold px-2 py-1 text-xl border-2 border-white hover:border-brutalist-pink hover:bg-black hover:text-brutalist-pink transition-colors sm:hidden">
                  R_K
                </div>
                <span className="font-bold text-lg tracking-tighter hidden md:block">
                  RYAN_KELLY.DEV
                </span>
              </div>
            </Link>
          </div>
          <div className="flex items-center text-base leading-5">
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
        <main className="mb-auto">{children}</main>
        <Footer />
      </div>
    </SectionContainer>
  );
};

export default LayoutWrapper;
