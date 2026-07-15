// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Colors',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Swatches use token *classes* (never hex literals) so every swatch re-maps
// when the theme toolbar cycles HIGH → DIM → SKETCH. Cycle to SKETCH to see
// the paper analogy: black becomes paper, white becomes ink, and the neon
// accents become ballpoint blue / red pen / green marker.
const Swatch = ({
  bg,
  label,
  note,
  border = true,
}: {
  bg: string;
  label: string;
  note: string;
  border?: boolean;
}) => (
  <div className="flex items-center gap-4">
    <div
      className={`h-16 w-24 shrink-0 ${bg} ${border ? 'border-2 border-white' : ''}`}
    />
    <div className="font-mono text-sm">
      <p className="font-bold text-white">{label}</p>
      <p className="text-zinc-400">{note}</p>
    </div>
  </div>
);

export const Accents: Story = {
  render: () => (
    <div className="space-y-4">
      <Swatch
        bg="bg-brutalist-cyan"
        label="brutalist-cyan"
        note="Links / primary accent — ballpoint blue on paper"
      />
      <Swatch
        bg="bg-brutalist-pink"
        label="brutalist-pink"
        note="Hover / highlights — red pen on paper"
      />
      <Swatch
        bg="bg-brutalist-yellow"
        label="brutalist-yellow"
        note="Warnings / emphasis / tags — green marker on paper"
      />
    </div>
  ),
};

export const Surfaces: Story = {
  render: () => (
    <div className="space-y-4">
      <Swatch
        bg="bg-black"
        label="black (--color-black)"
        note="Page surface — terminal screen / paper sheet"
      />
      <Swatch
        bg="bg-zinc-900"
        label="zinc-900"
        note="Panel surface — one notch off the page"
      />
      <Swatch bg="bg-zinc-800" label="zinc-800" note="Raised surface" />
      <Swatch
        bg="bg-white"
        label="white (--color-white)"
        note="Text + borders — phosphor / graphite ink"
      />
    </div>
  ),
};

export const MutedText: Story = {
  render: () => (
    <div className="space-y-2 font-mono">
      <p className="text-white">text-white — primary</p>
      <p className="text-zinc-300">text-zinc-300</p>
      <p className="text-zinc-400">text-zinc-400 — secondary</p>
      <p className="text-zinc-500">text-zinc-500 — metadata / captions</p>
    </div>
  ),
};

export const AllTokens: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="border-b-2 border-white pb-4">
        <h1 className="font-display text-3xl font-bold uppercase text-white">
          [ COLOR_TOKENS ]
        </h1>
        <p className="mt-2 font-mono text-sm text-zinc-400">
          {'>'} Cycle the theme toolbar: every swatch below re-maps because it
          is built on tokens, never hex literals.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Swatch bg="bg-brutalist-cyan" label="brutalist-cyan" note="accent" />
        <Swatch bg="bg-brutalist-pink" label="brutalist-pink" note="accent" />
        <Swatch
          bg="bg-brutalist-yellow"
          label="brutalist-yellow"
          note="accent"
        />
        <Swatch bg="bg-black" label="black" note="page surface" />
        <Swatch bg="bg-zinc-900" label="zinc-900" note="panel" />
        <Swatch bg="bg-white" label="white" note="ink / text" />
      </div>
    </div>
  ),
};
