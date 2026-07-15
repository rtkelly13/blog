// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import BracketText from './BracketText';

const meta = {
  title: 'Atoms/BracketText',
  component: BracketText,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BracketText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InHeading: Story = {
  args: { children: 'BRACKETED_TITLE' },
  render: (args) => (
    <h1 className="font-display text-4xl font-bold uppercase text-white">
      <BracketText {...args} />
    </h1>
  ),
};

export const InlineAccent: Story = {
  args: { children: 'STATUS' },
  render: (args) => (
    <p className="font-mono text-sm text-brutalist-cyan">
      <BracketText {...args} />
    </p>
  ),
};
