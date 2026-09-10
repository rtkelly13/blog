// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import Link from './Link';

const meta = {
  title: 'Atoms/Link',
  component: Link,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Internal: Story = {
  args: {
    href: '/blog',
    children: '> internal_link',
    className: 'font-mono text-accent-primary hover:text-accent-tertiary',
  },
};

export const External: Story = {
  args: {
    href: 'https://example.com',
    children: '> external_link (new tab)',
    className: 'font-mono text-accent-primary hover:text-accent-tertiary',
  },
};

export const Anchor: Story = {
  args: {
    href: '#section',
    children: '> anchor_link',
    className: 'font-mono text-accent-secondary',
  },
};
