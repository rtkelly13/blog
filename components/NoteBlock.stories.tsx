// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import NoteBlock from './NoteBlock';

const meta = {
  title: 'Atoms/NoteBlock',
  component: NoteBlock,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'red', 'blue', 'green', 'yellow', 'gray'],
    },
  },
} satisfies Meta<typeof NoteBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Note',
    color: 'primary',
    children: 'Build only on remapped tokens; never hardcode hex literals.',
  },
};

export const Warning: Story = {
  args: {
    title: 'Warning',
    color: 'yellow',
    children: 'Neon glows are a dark-mode device — sketch swaps them for ink.',
  },
};

export const AllColors: Story = {
  args: { children: 'note' },
  render: () => (
    <div>
      {(['primary', 'red', 'blue', 'green', 'yellow', 'gray'] as const).map(
        (c) => (
          <NoteBlock key={c} title={c} color={c}>
            NoteBlock with the {c} accent.
          </NoteBlock>
        ),
      )}
    </div>
  ),
};
