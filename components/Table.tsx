import {
  Table as DsTable,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@rtkelly13/design-system';
import type { ComponentProps } from 'react';

export {
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};

export type TableProps = ComponentProps<typeof DsTable>;

/**
 * Responsive Brutalist Table component re-exported from @rtkelly13/design-system.
 * Wraps native markdown/MDX tables in an overflow-x-auto container with
 * cyber/brutalist borders and surfaces.
 */
export const Table = ({
  containerClassName,
  className,
  ...props
}: TableProps) => (
  <DsTable
    containerClassName={`not-prose my-6 ${containerClassName ?? ''}`.trim()}
    className={className}
    {...props}
  />
);

export default Table;
