import { Pagination as DesignSystemPagination } from '@rtkelly13/design-system';

interface Props {
  totalPages: number;
  currentPage: number;
}

export default function Pagination({ totalPages, currentPage }: Props) {
  const getPageHref = (page: number) => {
    return page === 1 ? '/blog/' : `/blog/page/${page}`;
  };

  return (
    <DesignSystemPagination
      totalPages={totalPages}
      currentPage={currentPage}
      getPageHref={getPageHref}
    />
  );
}
