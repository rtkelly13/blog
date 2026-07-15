// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import Tag from './Tag';

const meta = {
  title: 'Atoms/Tag',
  component: Tag,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'typescript',
  },
};

export const MultiWord: Story = {
  args: {
    text: 'design systems',
  },
};

export const TagCloud: Story = {
  args: { text: 'tags' },
  render: () => (
    <div className="flex max-w-md flex-wrap gap-3">
      {['typescript', 'convex', 'design systems', 'nextjs', 'storybook'].map(
        (t) => (
          <Tag key={t} text={t} />
        ),
      )}
    </div>
  ),
};
