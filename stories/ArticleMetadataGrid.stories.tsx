import type { Meta, StoryObj } from '@storybook/react';
import ArticleMetadataGrid from '../components/ArticleMetadataGrid';

const meta = {
  title: 'Editorial/ArticleMetadataGrid',
  component: ArticleMetadataGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    published: { control: 'text' },
    readTime: { control: 'text' },
  },
} satisfies Meta<typeof ArticleMetadataGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StandardTechnicalPost: Story = {
  args: {
    published: 'SEPTEMBER 14, 2026',
    readTime: '14 MIN READ (~3,200 WORDS)',
    series: {
      name: 'DISTRIBUTED ARCHITECTURE',
      part: 2,
      totalParts: 5,
      href: '#series',
    },
    tags: ['parquet', 'dotnet', 'distributed', 'performance', 'raft'],
  },
};

export const StandaloneEssay: Story = {
  args: {
    published: 'AUGUST 28, 2026',
    readTime: '8 MIN READ',
    tags: ['ai-writing', 'software-design', 'brutalism'],
  },
};

export const MultipleLayoutsShowcase: Story = {
  args: {
    published: 'SEPTEMBER 14, 2026',
    readTime: '14 MIN READ',
    tags: ['parquet', 'csharp'],
  },
  render: () => (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="space-y-2">
        <h3 className="font-mono text-xs text-zinc-400">
          {'// MULTI-PART SERIES ESSAY'}
        </h3>
        <ArticleMetadataGrid
          published="2026-09-14"
          readTime="18 MIN READ"
          series={{
            name: 'PARQUET INTERNALS',
            part: 1,
            totalParts: 4,
          }}
          tags={['parquet', 'type-provider', 'fsharp', 'data-engineering']}
        />
      </div>

      <div className="space-y-2">
        <h3 className="font-mono text-xs text-zinc-400">
          {'// INDEPENDENT TALK DECK'}
        </h3>
        <ArticleMetadataGrid
          published="2026-07-22"
          readTime="45 MIN KEYNOTE"
          tags={['talks', 'architecture', 'concurrency']}
        />
      </div>
    </div>
  ),
};
