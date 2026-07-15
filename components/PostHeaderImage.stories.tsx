// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import PostHeaderImage from './PostHeaderImage';

const meta = {
  title: 'Molecules/PostHeaderImage',
  component: PostHeaderImage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Deterministic, asset-free post hero. The palette, decorative field, and layout are a pure function of `slug`, so the same post always renders the same banner — and it is pixel-identical to the rasterised OG card produced at build time by `scripts/generate-og-images.mjs`. Change the slug to see the palette/motif change.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['banner', 'og'],
      description: 'Aspect variant: on-page hero (2:1) vs social card (1.91:1)',
    },
    title: { control: 'text' },
    slug: { control: 'text', description: 'Determinism seed' },
    date: { control: 'text' },
  },
} satisfies Meta<typeof PostHeaderImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LongTitle: Story = {
  args: {
    title:
      'The Virtual Monorepo: Giving Coding Agents One World to Reason About',
    slug: 'virtual-monorepo-coding-agents',
    tags: ['ai', 'coding-agents', 'monorepo', 'architecture'],
    date: '2026-07-04',
    variant: 'banner',
  },
};

export const ShortTitle: Story = {
  args: {
    title: 'AWS Batch - Cookbook',
    slug: 'aws-batch/cookbook',
    tags: ['aws', 'aws-batch', 'docker'],
    date: '2022-08-19',
    variant: 'banner',
  },
};

export const SocialCard: Story = {
  args: {
    title: 'Reviving My Blog After 3 Years',
    slug: 'blog-upgrade-2026',
    tags: ['nextjs', 'tailwind', 'react', 'design'],
    date: '2026-01-15',
    variant: 'og',
  },
};
