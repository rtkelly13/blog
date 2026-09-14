import type { Meta, StoryObj } from '@storybook/react';
import AsciiGauge from '../components/AsciiGauge';

const meta = {
  title: 'Terminal/AsciiGauge',
  component: AsciiGauge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    target: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    length: { control: { type: 'number', min: 4, max: 32 } },
    variant: {
      control: 'select',
      options: ['block', 'shade', 'line', 'ascii', 'braille'],
    },
    accent: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'danger',
      ],
    },
    showValue: { control: 'boolean' },
  },
} satisfies Meta<typeof AsciiGauge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultBlock: Story = {
  args: {
    value: 65,
    length: 12,
    variant: 'block',
    accent: 'primary',
    showValue: true,
  },
};

export const WithBenchmarkTarget: Story = {
  args: {
    value: 55,
    target: 80,
    length: 16,
    variant: 'block',
    accent: 'primary',
    showValue: true,
  },
};

export const ShadedDensity: Story = {
  args: {
    value: 80,
    length: 16,
    variant: 'shade',
    accent: 'success',
    showValue: true,
  },
};

export const LineRuler: Story = {
  args: {
    value: 40,
    length: 16,
    variant: 'line',
    accent: 'secondary',
    showValue: true,
  },
};

export const PlainAscii: Story = {
  args: {
    value: 75,
    length: 14,
    variant: 'ascii',
    accent: 'warning',
    showValue: true,
  },
};

export const BrailleMicroMeter: Story = {
  args: {
    value: 90,
    length: 10,
    variant: 'braille',
    accent: 'danger',
    showValue: true,
  },
};

export const AllVariantsMatrix: Story = {
  args: {
    value: 75,
  },
  render: () => (
    <div className="flex flex-col gap-3 font-mono text-xs p-4 bg-zinc-950 border border-white/20">
      <div className="flex items-center justify-between gap-6">
        <span className="text-zinc-400 w-24">BLOCK:</span>
        <AsciiGauge
          value={75}
          target={90}
          variant="block"
          accent="primary"
          showValue
        />
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-zinc-400 w-24">SHADE:</span>
        <AsciiGauge
          value={75}
          target={90}
          variant="shade"
          accent="success"
          showValue
        />
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-zinc-400 w-24">LINE:</span>
        <AsciiGauge
          value={75}
          target={90}
          variant="line"
          accent="secondary"
          showValue
        />
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-zinc-400 w-24">ASCII:</span>
        <AsciiGauge
          value={75}
          target={90}
          variant="ascii"
          accent="warning"
          showValue
        />
      </div>
      <div className="flex items-center justify-between gap-6">
        <span className="text-zinc-400 w-24">BRAILLE:</span>
        <AsciiGauge
          value={75}
          target={90}
          variant="braille"
          accent="danger"
          showValue
        />
      </div>
    </div>
  ),
};
