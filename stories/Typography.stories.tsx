// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Design Sandbox/Typography',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Headings: Story = {
  render: () => (
    <div className="bg-black border-2 border-white p-8 space-y-6">
      <h1 className="text-3xl md:text-6xl font-mono font-bold uppercase text-white border-2 border-white inline-block px-4 py-2">
        [ H1_HEADING ]
      </h1>
      <h2 className="text-2xl md:text-4xl font-mono font-bold uppercase text-white">
        {'>'} H2_HEADING
      </h2>
      <h3 className="text-xl md:text-3xl font-mono font-bold uppercase text-white border-b-2 border-white/20 pb-2">
        {'// H3_HEADING'}
      </h3>
      <h4 className="text-lg md:text-2xl font-mono font-bold uppercase text-brutalist-cyan">
        $ H4_HEADING
      </h4>
      <h5 className="text-base md:text-xl font-mono font-bold uppercase text-brutalist-pink">
        * H5_HEADING
      </h5>
      <h6 className="text-sm md:text-lg font-mono font-bold uppercase text-brutalist-yellow">
        # H6_HEADING
      </h6>
    </div>
  ),
};

export const BodyText: Story = {
  render: () => (
    <div className="bg-black border-2 border-white p-8 space-y-4">
      <p className="font-mono text-base text-white">
        Standard body text using monospace font. Clear and readable for longer
        content.
      </p>
      <p className="font-mono text-base text-zinc-400">
        Secondary text in zinc-400 for less important content or supporting
        information.
      </p>
      <p className="font-mono text-sm text-zinc-500">
        Small text for captions, metadata, or footer content.
      </p>
      <p className="font-mono text-lg text-white font-bold">
        Large bold text for emphasis or important callouts.
      </p>
    </div>
  ),
};

export const TerminalPrompts: Story = {
  render: () => (
    <div className="bg-black border-2 border-white p-8 space-y-4">
      <div className="font-mono text-sm">
        <span className="text-brutalist-cyan">{'>'}</span>
        <span className="text-white ml-2">
          Arrow prompt for navigation items
        </span>
      </div>
      <div className="font-mono text-sm">
        <span className="text-brutalist-pink">{'$'}</span>
        <span className="text-white ml-2">Dollar sign for command prompts</span>
      </div>
      <div className="font-mono text-sm">
        <span className="text-brutalist-yellow">{'//'}</span>
        <span className="text-white ml-2">
          Double slash for comments or sections
        </span>
      </div>
      <div className="font-mono text-sm">
        <span className="text-code-green">{'*'}</span>
        <span className="text-white ml-2">
          Asterisk for list items or bullets
        </span>
      </div>
      <div className="font-mono text-sm">
        <span className="text-white">{'['}</span>
        <span className="text-brutalist-cyan">STATUS</span>
        <span className="text-white">{']'}</span>
        <span className="text-zinc-400 ml-2">Bracketed status indicators</span>
      </div>
    </div>
  ),
};

export const CodeBlocks: Story = {
  render: () => (
    <div className="bg-black border-2 border-white p-8 space-y-4">
      <div className="bg-zinc-900 border-2 border-white p-4 overflow-x-auto relative">
        <div className="absolute top-0 right-0 bg-brutalist-yellow text-black px-2 py-1 text-xs font-mono font-bold">
          TYPESCRIPT
        </div>
        <pre className="font-mono text-sm text-code-green">
          {`function greet(name: string): void {
  console.log(\`> Hello, \${name}!\`);
}

greet('WORLD');`}
        </pre>
      </div>

      <div className="bg-black border border-white p-3">
        <code className="font-mono text-xs text-brutalist-cyan">
          npm install @brutalist/ui
        </code>
      </div>
    </div>
  ),
};

export const Links: Story = {
  render: () => (
    <div className="bg-black border-2 border-white p-8 space-y-4">
      <a
        href="#"
        className="font-mono text-base text-brutalist-cyan hover:text-brutalist-pink border-b-2 border-brutalist-cyan hover:border-brutalist-pink transition-colors block"
      >
        {'>'} STANDARD_LINK
      </a>

      <div>
        <a
          href="#"
          className="font-mono text-sm font-bold text-white bg-brutalist-cyan px-4 py-2 border-2 border-white hover:bg-brutalist-pink transition-colors inline-block"
        >
          [ BUTTON_LINK ]
        </a>
      </div>

      <a
        href="#"
        className="font-mono text-sm text-brutalist-yellow hover:text-brutalist-pink transition-colors flex items-center gap-2 w-fit"
      >
        <span>{'>'}</span>
        <span>ARROW_LINK</span>
        <span>→</span>
      </a>
    </div>
  ),
};

export const TagsAndBadges: Story = {
  render: () => (
    <div className="bg-black border-2 border-white p-8">
      <div className="flex flex-wrap gap-3">
        <span className="bg-brutalist-yellow text-black font-mono text-xs font-bold px-3 py-1 border-2 border-white uppercase">
          TAG_NAME
        </span>
        <span className="bg-brutalist-cyan text-black font-mono text-xs font-bold px-3 py-1 border-2 border-white uppercase">
          FEATURED
        </span>
        <span className="bg-brutalist-pink text-black font-mono text-xs font-bold px-3 py-1 border-2 border-white uppercase">
          NEW
        </span>
        <span className="bg-black text-code-green font-mono text-xs font-bold px-3 py-1 border-2 border-code-green uppercase">
          [ACTIVE]
        </span>
        <span className="bg-zinc-900 text-white font-mono text-xs font-bold px-3 py-1 border border-white uppercase">
          DRAFT
        </span>
      </div>
    </div>
  ),
};

export const AllTypography: Story = {
  render: () => (
    <div className="space-y-8 p-8">
      <div className="border-b-2 border-white pb-4">
        <h1 className="text-3xl font-extrabold text-white font-mono uppercase border-2 border-white inline-block px-4 py-2">
          [ TYPOGRAPHY_SYSTEM ]
        </h1>
        <p className="text-lg text-zinc-400 font-mono mt-4">
          {'>'} Brutalist text styles with monospace fonts and terminal
          aesthetics
        </p>
      </div>

      <section className="space-y-4">
        <div className="border-l-4 border-brutalist-cyan pl-4">
          <h2 className="text-2xl font-mono font-bold text-white uppercase">
            01. HEADINGS
          </h2>
        </div>
        <div className="bg-black border-2 border-white p-8 space-y-6">
          <h1 className="text-3xl md:text-6xl font-mono font-bold uppercase text-white border-2 border-white inline-block px-4 py-2">
            [ H1_HEADING ]
          </h1>
          <h2 className="text-2xl md:text-4xl font-mono font-bold uppercase text-white">
            {'>'} H2_HEADING
          </h2>
          <h3 className="text-xl md:text-3xl font-mono font-bold uppercase text-white border-b-2 border-white/20 pb-2">
            {'// H3_HEADING'}
          </h3>
          <h4 className="text-lg md:text-2xl font-mono font-bold uppercase text-brutalist-cyan">
            $ H4_HEADING
          </h4>
        </div>
      </section>

      <section className="space-y-4">
        <div className="border-l-4 border-brutalist-pink pl-4">
          <h2 className="text-2xl font-mono font-bold text-white uppercase">
            02. BODY_TEXT
          </h2>
        </div>
        <div className="bg-black border-2 border-white p-8 space-y-4">
          <p className="font-mono text-base text-white">
            Standard body text using monospace font. Clear and readable for
            longer content.
          </p>
          <p className="font-mono text-base text-zinc-400">
            Secondary text in zinc-400 for less important content or supporting
            information.
          </p>
        </div>
      </section>

      <div className="border-2 border-brutalist-cyan bg-zinc-900 p-6">
        <h3 className="font-mono font-bold text-xl text-brutalist-cyan uppercase mb-4">
          [ TYPOGRAPHY_RULES ]
        </h3>
        <ul className="space-y-2 font-mono text-sm text-zinc-300">
          <li className="flex items-start">
            <span className="text-brutalist-cyan mr-2">{'>'}</span>
            <span>
              <strong className="text-white">Font:</strong> Always use monospace
              (font-mono)
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-brutalist-cyan mr-2">{'>'}</span>
            <span>
              <strong className="text-white">Headings:</strong> Always
              uppercase, bold, with terminal prefixes
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-brutalist-cyan mr-2">{'>'}</span>
            <span>
              <strong className="text-white">Code:</strong> Neon green (#39ff14)
              on black background
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-brutalist-pink mr-2">*</span>
            <span>No rounded corners (border-radius: 0px)</span>
          </li>
          <li className="flex items-start">
            <span className="text-brutalist-pink mr-2">*</span>
            <span>Hard borders (2px for emphasis, 1px for subtle)</span>
          </li>
        </ul>
      </div>
    </div>
  ),
};
