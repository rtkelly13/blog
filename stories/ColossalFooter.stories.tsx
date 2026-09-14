import type { Meta, StoryObj } from '@storybook/react';
import ColossalFooter from '../components/ColossalFooter';

const meta = {
  title: 'Editorial/ColossalFooter',
  component: ColossalFooter,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    brand: { control: 'text' },
    signoff: { control: 'text' },
  },
} satisfies Meta<typeof ColossalFooter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultColossalFooter: Story = {
  args: {
    brand: 'RYAN KELLY',
    signoff: 'ENGINEERING HIGH-THROUGHPUT SYSTEMS & RETRO-BRUTALIST CODEBASES',
  },
};
