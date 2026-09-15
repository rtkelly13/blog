import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Editorial/TypographyScale',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

export const TypographicScaleSpecimens: Story = {
  render: () => (
    <div className="max-w-5xl mx-auto space-y-12 p-6 font-sans">
      <div className="border-b-2 border-white pb-4 font-mono text-xs text-zinc-400">
        {'// EDITORIAL TYPOGRAPHY HIERARCHY SPECIMENS'}
      </div>

      {/* 1. Ultra Display Article Headline */}
      <div className="space-y-2">
        <div className="font-mono text-xs font-bold text-accent-primary">
          {
            '[ DISPLAY H1 // clamp(2.75rem, 6.5vw, 5.5rem) // leading-[0.88] // tracking-[-0.035em] ]'
          }
        </div>
        <h1
          className="font-black uppercase text-white tracking-[-0.035em]"
          style={{
            fontSize: 'clamp(2.75rem, 6.5vw, 5.5rem)',
            lineHeight: 0.88,
          }}
        >
          Building a Distributed Log Engine in C#
        </h1>
      </div>

      {/* 2. Secondary Display Section Header */}
      <div className="space-y-2 pt-6 border-t border-white/20">
        <div className="font-mono text-xs font-bold text-accent-secondary">
          {'[ SECTION H2 // clamp(1.75rem, 4vw, 3rem) // leading-[0.95] ]'}
        </div>
        <h2
          className="font-bold uppercase text-white tracking-tight"
          style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', lineHeight: 0.95 }}
        >
          Zero-Copy Binary Formats & SIMD Vectorization
        </h2>
      </div>

      {/* 3. Terminal Prompt Header */}
      <div className="space-y-2 pt-6 border-t border-white/20 font-mono">
        <div className="text-xs font-bold text-zinc-400">
          {'[ TERMINAL PROMPT SUBHEADER // text-sm font-bold ]'}
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-white text-xs font-bold text-accent-primary">
          <span>&gt; {'EXEC // BENCHMARK_RUNNER --THROUGHPUT=VECTORIZED'}</span>
          <span className="w-1.5 h-3 bg-accent-primary animate-pulse" />
        </div>
      </div>

      {/* 4. Reading Body Prose */}
      <div className="space-y-2 pt-6 border-t border-white/20 max-w-2xl">
        <div className="font-mono text-xs font-bold text-zinc-400">
          {'[ EDITORIAL BODY PROSE // text-base leading-relaxed // font-sans ]'}
        </div>
        <p className="text-base text-zinc-300 leading-relaxed">
          Modern memory management in .NET 10 allows developers to write
          zero-allocation pipelines using{' '}
          <code className="px-1 py-0.5 bg-zinc-800 text-accent-primary font-mono text-xs border border-white/20">
            ReadOnlySpan&lt;T&gt;
          </code>{' '}
          and memory pooling. When handling millions of streaming partition
          records, bypassing the garbage collector is not an optimization—it is
          the baseline architecture.
        </p>
      </div>
    </div>
  ),
};
