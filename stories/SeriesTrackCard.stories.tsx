import type { Meta, StoryObj } from '@storybook/react';
import SeriesTrackCard from '../components/SeriesTrackCard';

const sampleTrackItems = [
  {
    id: 'step-1',
    number: '01',
    title: 'The Storage Engine: Log-Structured Append-Only Files',
    summary:
      'Binary file layout, CRC32 checksum records, zero-copy socket transfers.',
    duration: '14 min',
    status: 'completed' as const,
    href: '#part-1',
  },
  {
    id: 'step-2',
    number: '02',
    title: 'Partition Replication & Leader Election in Raft',
    summary: 'Heartbeat protocol, randomized election timeouts, term numbers.',
    duration: '22 min',
    status: 'completed' as const,
    href: '#part-2',
  },
  {
    id: 'step-3',
    number: '03',
    title: 'Consumer Group Rebalancing & Offset Commits',
    summary: 'Eager vs Cooperative Sticky assignment algorithms.',
    duration: '18 min',
    status: 'current' as const,
    href: '#part-3',
  },
  {
    id: 'step-4',
    number: '04',
    title: 'High-Throughput Batching & Vectorized Compression',
    summary: 'Snappy and LZ4 SIMD memory block compression.',
    duration: '16 min',
    status: 'upcoming' as const,
  },
  {
    id: 'step-5',
    number: '05',
    title: 'Exactly-Once Semantics (EOS) & 2-Phase Commit',
    summary: 'Transactional coordinator state machine in distributed logs.',
    duration: '25 min',
    status: 'upcoming' as const,
  },
];

const meta = {
  title: 'Editorial/SeriesTrackCard',
  component: SeriesTrackCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    trackNumber: { control: 'text' },
    title: { control: 'text' },
  },
} satisfies Meta<typeof SeriesTrackCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ParquetCurriculumTrack: Story = {
  args: {
    trackNumber: '01',
    title: 'MINI-KAFKA // DISTRIBUTED LOG ENGINE IN C# & RUST',
    description:
      'A multi-part hands-on guide building a distributed, partition-replicated streaming commit log from bare sockets to zero-copy vector serialization.',
    items: sampleTrackItems,
  },
};

export const CompletedTrack: Story = {
  args: {
    trackNumber: '02',
    title: 'HIGH-PERFORMANCE PARQUET SERIALIZATION',
    description:
      'Mastering the Apache Parquet format in modern .NET and F# with compile-time schema inference.',
    items: sampleTrackItems.map((item) => ({
      ...item,
      status: 'completed' as const,
    })),
  },
};
