// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import ForceGraph from './ForceGraph';

const NODES = [
  { id: 'app', accent: 'yellow' },
  { id: 'A', accent: 'cyan' },
  { id: 'B', accent: 'cyan' },
  { id: 'Lib v1', accent: 'pink' },
  { id: 'Lib v2', accent: 'pink' },
];

const LINKS = [
  { source: 'app', target: 'A' },
  { source: 'app', target: 'B' },
  { source: 'A', target: 'Lib v1' },
  { source: 'B', target: 'Lib v2' },
];

const meta = {
  title: 'Charts/ForceGraph',
  component: ForceGraph,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ForceGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Settled coordinates, drawn once — d3-force runs to completion in render. */
export const Default: Story = {
  args: {
    label: 'Diamond dependency graph, force-placed',
    nodes: NODES,
    links: LINKS,
    width: 320,
    height: 240,
  },
};

/** The digest is the determinism receipt: same input, same string, every run. */
export const WithDigest: Story = {
  args: {
    ...Default.args,
    showDigest: true,
  },
};

/** Fewer ticks settle less — proof the tick count is doing something. */
export const Underrelaxed: Story = {
  args: {
    ...Default.args,
    ticks: 20,
  },
};

/** A link naming an absent node is dropped, not thrown on. */
export const DanglingLink: Story = {
  args: {
    ...Default.args,
    links: [...LINKS, { source: 'app', target: 'missing' }],
  },
};
