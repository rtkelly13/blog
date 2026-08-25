// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import BarChart from './BarChart';

const meta = {
  title: 'Charts/BarChart',
  component: BarChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The measured d3 submodule costs from docs/d3-research.md. */
export const Default: Story = {
  args: {
    label: 'Gzipped cost per d3 usage shape, in kilobytes',
    unit: 'KB',
    labelWidth: 200,
    valueWidth: 120,
    data: [
      { label: 'd3-quadtree', value: 1.9 },
      { label: 'd3-force', value: 4.9, accent: 'pink' },
      { label: 'd3-scale', value: 13.0 },
      { label: 'chart primitive', value: 15.2, accent: 'yellow' },
    ],
  },
};

/** A dashed, unfilled row reads as the thing being compared against. */
export const WithBaseline: Story = {
  args: {
    label: 'Tree-shaken versus escaped namespace',
    unit: 'KB',
    labelWidth: 200,
    valueWidth: 160,
    rowHeight: 44,
    data: [
      { label: 'shaken', value: 18.1, baseline: true, note: '· baseline' },
      { label: 'namespace escapes', value: 94.1, accent: 'pink' },
    ],
  },
};

/** Notes and a pinned domain, so several charts can share one scale. */
export const PinnedDomain: Story = {
  args: {
    label: 'Renderer options against a fixed 250 KB axis',
    unit: 'KB',
    labelWidth: 200,
    valueWidth: 170,
    domainMax: 250,
    data: [
      { label: 'raw WebGL2', value: 0.8, accent: 'yellow', note: '· shipped' },
      { label: 'ogl', value: 13.0 },
      { label: 'three', value: 129.6 },
      { label: 'r3f + three', value: 237.9, accent: 'pink' },
    ],
  },
};

/** Empty data must render an empty chart, not crash or divide by zero. */
export const Empty: Story = {
  args: {
    label: 'No data',
    data: [],
  },
};
