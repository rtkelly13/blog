import Link from '@/components/Link';

interface Props {
  totalPages: number;
  currentPage: number;
}

export default function Pagination({ totalPages, currentPage }: Props) {
  const prevPage = currentPage - 1 > 0;
  const nextPage = currentPage + 1 <= totalPages;

  return (
    <div className="pt-6 pb-8 space-y-2 md:space-y-5">
      <nav className="flex justify-between items-center font-mono">
        {!prevPage && (
          <button
            className="cursor-not-allowed opacity-50 border-2 border-white bg-zinc-900 text-white px-6 py-3 font-bold uppercase"
            disabled={!prevPage}
          >
            &lt;&lt; PREV
          </button>
        )}
        {prevPage && (
          <Link
            href={
              currentPage - 1 === 1 ? `/blog/` : `/blog/page/${currentPage - 1}`
            }
          >
            <button className="border-2 border-white bg-brutalist-cyan text-black px-6 py-3 font-bold uppercase shadow-hard-md hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
              &lt;&lt; PREV
            </button>
          </Link>
        )}
        <span className="text-white font-bold border-2 border-white px-6 py-3 bg-black">
          [ {currentPage} / {totalPages} ]
        </span>
        {!nextPage && (
          <button
            className="cursor-not-allowed opacity-50 border-2 border-white bg-zinc-900 text-white px-6 py-3 font-bold uppercase"
            disabled={!nextPage}
          >
            NEXT &gt;&gt;
          </button>
        )}
        {nextPage && (
          <Link href={`/blog/page/${currentPage + 1}`}>
            <button className="border-2 border-white bg-brutalist-pink text-black px-6 py-3 font-bold uppercase shadow-hard-md hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
              NEXT &gt;&gt;
            </button>
          </Link>
        )}
      </nav>
    </div>
  );
}
