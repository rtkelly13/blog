// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Borders & Shadows',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ className, label }: { className: string; label: string }) => (
  <div className="flex flex-col items-start gap-2">
    <div
      className={`flex h-24 w-48 items-center justify-center bg-zinc-900 font-mono text-xs text-white ${className}`}
    >
      {label}
    </div>
    <code className="font-mono text-xs text-zinc-400">{label}</code>
  </div>
);

export const Borders: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8">
      <Box className="border border-white" label="border (1px)" />
      <Box className="border-2 border-white" label="border-2 (canonical)" />
      <Box
        className="border-4 border-double border-white"
        label="border-4 double"
      />
      <Box className="border-2 border-brutalist-cyan" label="accent border" />
    </div>
  ),
};

export const HardShadows: Story = {
  render: () => (
    <div className="flex flex-wrap gap-10 p-4">
      <Box
        className="border-2 border-white shadow-hard-sm"
        label="shadow-hard-sm"
      />
      <Box
        className="border-2 border-white shadow-hard-md"
        label="shadow-hard-md"
      />
      <Box
        className="border-2 border-white shadow-hard-lg"
        label="shadow-hard-lg"
      />
    </div>
  ),
};

export const ColoredShadows: Story = {
  render: () => (
    <div className="flex flex-wrap gap-10 p-4">
      <Box
        className="border-2 border-white shadow-hard-cyan"
        label="shadow-hard-cyan"
      />
      <Box
        className="border-2 border-white shadow-hard-pink"
        label="shadow-hard-pink"
      />
      <Box
        className="border-2 border-white shadow-hard-yellow"
        label="shadow-hard-yellow"
      />
    </div>
  ),
};

export const PressInteraction: Story = {
  render: () => (
    <div className="p-4">
      <button
        type="button"
        className="border-2 border-white bg-brutalist-cyan px-6 py-3 font-mono font-bold uppercase text-black shadow-hard-md transition-all hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none"
      >
        PRESS_ME
      </button>
      <p className="mt-4 font-mono text-sm text-zinc-400">
        {'>'} Active state translates into the shadow — the element physically
        presses into the page (letterpress on paper, button-mash on terminal).
      </p>
    </div>
  ),
};

export const TerminalVsPaperMotifs: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="ascii-divider" />
      <p className="terminal-prompt font-mono text-white">
        terminal-prompt utility — blue pen prompt under SKETCH
      </p>
      <p className="file-extension font-mono font-bold text-white">my_note</p>
      <p className="font-mono text-sm text-zinc-400">
        {'>'} Cycle to SKETCH: the ASCII divider becomes a hand-ruled pencil
        dash line, the prompt inks over, selection turns highlighter-yellow.
      </p>
    </div>
  ),
};
