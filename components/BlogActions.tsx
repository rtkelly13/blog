import { FileText, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Toc } from 'types/Toc';
import siteMetadata from '@/data/siteMetadata';

interface BlogActionsProps {
  toc?: Toc;
  activeId?: string;
}

const BlogActions = ({ toc, activeId }: BlogActionsProps) => {
  const [show, setShow] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 50) setShow(true);
      else setShow(false);
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsOpen(false);
  };

  const handleScrollToComment = () => {
    document.getElementById('comment')?.scrollIntoView({ behavior: 'smooth' });
    setIsOpen(false);
  };

  const handleTocToggle = () => {
    setTocOpen(!tocOpen);
    setIsOpen(false);
  };

  const handleTocLinkClick = () => {
    setTocOpen(false);
  };

  return (
    <>
      <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-3">
        <div
          className={`flex flex-col gap-3 transition-all duration-300 ${
            isOpen
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          {toc && toc.length > 0 && (
            <button
              aria-label="Toggle table of contents"
              type="button"
              onClick={handleTocToggle}
              className="border-2 border-white bg-brutalist-cyan text-black p-3 transition-all hover:shadow-[4px_4px_0px_0px_#ffffff] active:translate-x-1 active:translate-y-1"
            >
              <FileText className="h-5 w-5" />
            </button>
          )}

          {show && (
            <>
              {siteMetadata.comment?.provider && (
                <button
                  aria-label="Scroll To Comment"
                  type="button"
                  onClick={handleScrollToComment}
                  className="border-2 border-white bg-black p-3 text-white transition-all hover:bg-brutalist-cyan hover:text-black active:translate-x-1 active:translate-y-1"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
              <button
                aria-label="Scroll To Top"
                type="button"
                onClick={handleScrollTop}
                className="border-2 border-white bg-black p-3 text-white transition-all hover:bg-brutalist-cyan hover:text-black active:translate-x-1 active:translate-y-1"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </>
          )}
        </div>

        <button
          aria-label={isOpen ? 'Close actions menu' : 'Open actions menu'}
          aria-expanded={isOpen}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="border-2 border-white bg-black p-3 text-white transition-all hover:bg-brutalist-cyan hover:text-black hover:shadow-[4px_4px_0px_0px_#ffffff] active:translate-x-1 active:translate-y-1"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {toc && toc.length > 0 && (
        <>
          <aside
            className={`
              fixed top-0 right-0 h-full w-80 max-w-[90vw]
              border-l-2 border-white bg-zinc-900 p-6
              transition-transform duration-300 ease-in-out
              z-50
              ${tocOpen ? 'translate-x-0' : 'translate-x-full'}
            `}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-brutalist-cyan" />
                <h2 className="font-mono text-sm font-bold uppercase text-brutalist-yellow">
                  [ CONTENTS ]
                </h2>
              </div>
              <button
                onClick={() => setTocOpen(false)}
                className="text-brutalist-cyan hover:text-brutalist-pink transition-colors"
                aria-label="Close table of contents"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="overflow-y-auto max-h-[calc(100vh-120px)]">
              <ul className="space-y-3 font-mono text-sm">
                {toc.map((heading) => (
                  <li
                    key={heading.url}
                    style={{
                      paddingLeft: `${(heading.depth - 1) * 1}rem`,
                    }}
                  >
                    <a
                      href={heading.url}
                      onClick={handleTocLinkClick}
                      className={`block hover:text-brutalist-pink transition-colors ${
                        activeId === heading.url.slice(1)
                          ? 'text-brutalist-cyan font-bold'
                          : 'text-zinc-400'
                      }`}
                    >
                      <span className="text-brutalist-yellow">&gt;</span>{' '}
                      {heading.value}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {tocOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setTocOpen(false)}
              aria-hidden="true"
            />
          )}
        </>
      )}
    </>
  );
};

export default BlogActions;
