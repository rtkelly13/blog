// @ts-nocheck
import type { Meta, StoryObj } from '@storybook/react';
import Card from './Card';

const meta = {
  title: 'Molecules/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    title: 'Design Systems',
    description:
      'One token set, three themes. Hard borders, hard shadows, zero radius.',
    href: '/blog',
  },
};

export const WithFilename: Story = {
  args: {
    title: 'Paper And Ink',
    description: 'The SKETCH theme prints the terminal onto paper.',
    filename: 'paper_and_ink.md',
    href: '/blog',
  },
};

export const WithAsciiArt: Story = {
  args: {
    title: 'Terminal Motifs',
    description: 'ASCII art in the card chrome, on-brand for HIGH mode.',
    asciiArt: '▓▒░',
    href: '/blog',
  },
};
