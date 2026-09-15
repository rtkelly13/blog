import type { Meta, StoryObj } from '@storybook/react';
import ArchitectureDiagram from '../components/diagrams/ArchitectureDiagram';

const meta = {
  title: 'Editorial/ArchitectureDiagram',
  component: ArchitectureDiagram,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    caption: { control: 'text' },
  },
} satisfies Meta<typeof ArchitectureDiagram>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MiniKafkaReplicationCluster: Story = {
  args: {
    title: 'SCHEMATIC // MINI_KAFKA_PARTITION_REPLICATION',
    caption:
      'Figure 1.1: Partition 0 Leader handling TCP append requests and fanning out sync log segments to in-sync followers via Raft.',
  },
};
