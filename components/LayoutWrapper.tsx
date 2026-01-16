import type { ReactNode } from 'react';
import Logo from '@/components/Logo';
import headerNavLinks from '@/data/headerNavLinks';
import siteMetadata from '@/data/siteMetadata';
import Footer from './Footer';
import Link from './Link';
import MobileNav from './MobileNav';
import SectionContainer from './SectionContainer';
import SearchButton from './search/SearchButton';
import ThemeSwitch from './ThemeSwitch';

interface Props {
  children: ReactNode;
}

const LayoutWrapper = ({ children }: Props) => {
  return (
    <SectionContainer>
      <div className="flex flex-col justify-between h-screen">
        <header
          className={`flex items-center justify-between py-4 ${
            siteMetadata.stickyNav ? 'sticky top-0 z-50' : ''
          } text-slate-800 dark:text-slate-100`}
        >
          <div>
            <Link href="/" aria-label="Ryan Kelly Blog">
              <div className="flex items-center justify-between">
                <div className="mr-3">
                  <Logo className="w-16 h-16" />
                </div>
                {typeof siteMetadata.headerTitle === 'string' ? (
                  <div className="hidden h-6 text-2xl font-semibold sm:block">
                    {siteMetadata.headerTitle}
                  </div>
                ) : (
                  siteMetadata.headerTitle
                )}
              </div>
            </Link>
          </div>
          <div className="flex items-center text-base leading-5">
            <div className="hidden sm:block">
              {headerNavLinks.map((link) => (
                <Link
                  key={link.title}
                  href={link.href}
                  className="p-1 font-medium sm:p-4 text-inherit hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {link.title}
                </Link>
              ))}
            </div>
            <SearchButton />
            <ThemeSwitch />
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
