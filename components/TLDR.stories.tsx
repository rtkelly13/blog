// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import TLDR from './TLDR';

const meta = {
  title: 'Atoms/TLDR',
  component: TLDR,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TLDR>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'One token set, three themes: write the terminal look once and the paper look comes for free.',
  },
};
