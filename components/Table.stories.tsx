// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import Table, {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './Table';

const meta = {
  title: 'Atoms/Table',
  component: Table,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Command</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Execution Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>pnpm test</TableCell>
          <TableCell>Run Vitest unit and integration suites</TableCell>
          <TableCell>1.2s</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>pnpm build</TableCell>
          <TableCell>Next.js production build and feed derivation</TableCell>
          <TableCell>14.5s</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>pnpm release:train</TableCell>
          <TableCell>Assess deployed commits and promote pointer</TableCell>
          <TableCell>0.8s</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
