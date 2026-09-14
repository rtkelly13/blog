import { describe, expect, it } from 'vitest';
import { MDXComponents } from '../components/MDXComponents';
import Table, {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/Table';

describe('Table MDX integration', () => {
  it('exports Table and subcomponents from components/Table', () => {
    expect(Table).toBeDefined();
    expect(TableHeader).toBeDefined();
    expect(TableBody).toBeDefined();
    expect(TableRow).toBeDefined();
    expect(TableHead).toBeDefined();
    expect(TableCell).toBeDefined();
    expect(TableFooter).toBeDefined();
  });

  it('registers table elements in MDXComponents', () => {
    expect(MDXComponents.table).toBe(Table);
    expect(MDXComponents.thead).toBe(TableHeader);
    expect(MDXComponents.tbody).toBe(TableBody);
    expect(MDXComponents.tr).toBe(TableRow);
    expect(MDXComponents.th).toBe(TableHead);
    expect(MDXComponents.td).toBe(TableCell);
    expect(MDXComponents.Table).toBe(Table);
  });
});
