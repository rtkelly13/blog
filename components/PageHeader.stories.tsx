// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import { FileText, Lightbulb, Presentation } from 'lucide-react';
import PageHeader from './PageHeader';

const meta = {
  title: 'Molecules/PageHeader',
  component: PageHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    accent: {
      control: 'select',
      options: ['cyan', 'pink', 'yellow'],
    },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

// Pages own the content wrapper; mirror it so the header reads in context.
const Wrapper = (Story) => (
  <div className="divide-y divide-white border-2 border-white bg-black">
    <Story />
    <div className="px-6 py-8 font-mono text-sm text-zinc-400">
      {'>'} listing content goes here
    </div>
  </div>
);

export const BlogCyan: Story = {
  decorators: [Wrapper],
  args: {
    title: 'BLOG',
    subtitle: 'Long-form writing on TypeScript, Convex and design systems',
    icon: FileText,
    accent: 'cyan',
  },
};

export const TalksPink: Story = {
  decorators: [Wrapper],
  args: {
    title: 'TALKS',
    subtitle: 'Live decks and recordings',
    icon: Presentation,
    accent: 'pink',
  },
};

export const IdeasYellow: Story = {
  decorators: [Wrapper],
  args: {
    title: 'IDEAS',
    subtitle: 'The workbench of half-formed things',
    icon: Lightbulb,
    accent: 'yellow',
  },
};
