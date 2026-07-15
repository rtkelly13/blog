// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import PageTitle from './PageTitle';

const meta = {
  title: 'Atoms/PageTitle',
  component: PageTitle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PageTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Page Title',
  },
};

export const LongTitle: Story = {
  args: {
    children: 'Interactive MDX components for technical talks',
  },
};
