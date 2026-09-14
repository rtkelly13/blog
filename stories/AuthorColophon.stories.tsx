import type { Meta, StoryObj } from '@storybook/react';
import AuthorColophon from '../components/AuthorColophon';

const meta = {
  title: 'Editorial/AuthorColophon',
  component: AuthorColophon,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    authorName: { control: 'text' },
    authorRole: { control: 'text' },
    bio: { control: 'text' },
    sectionMarker: { control: 'text' },
  },
} satisfies Meta<typeof AuthorColophon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultEssayEndnote: Story = {
  args: {
    authorName: 'RYAN KELLY',
    authorRole: 'STAFF ENGINEER // DISTRIBUTED SYSTEMS & COMPILERS',
    bio: 'I build high-throughput data engines, compiler extensions, and retro-brutalist developer tooling. Currently maintaining Parquet.SourceGenerator and the estate virtual monorepo.',
    sectionMarker: '§',
  },
};

export const TechnicalTalkColophon: Story = {
  args: {
    authorName: 'RYAN KELLY',
    authorRole: 'KEYNOTE SPEAKER // CONCURRENCY ARCHITECTURE',
    bio: 'Delivered at NDC London. Slides, benchmarks, and reproduction repos are open-sourced under the estate virtual monorepo.',
    sectionMarker: '¶',
    links: [
      { label: 'SLIDES.PDF', href: '#slides', icon: 'external' },
      { label: 'BENCHMARKS', href: '#bench', icon: 'code' },
      { label: 'TALK VIDEO', href: '#video', icon: 'external' },
    ],
  },
};
