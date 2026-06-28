import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Button from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['cyan', 'pink', 'yellow', 'white'],
      description: 'Button color variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
    children: {
      control: 'text',
      description: 'Button text content',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrimaryCyan: Story = {
  args: {
    variant: 'cyan',
    size: 'md',
    children: 'CLICK_ME',
  },
};

export const PrimaryPink: Story = {
  args: {
    variant: 'pink',
    size: 'md',
    children: 'EXECUTE',
  },
};

export const PrimaryYellow: Story = {
  args: {
    variant: 'yellow',
    size: 'md',
    children: 'SUBMIT',
  },
};

export const OutlineWhite: Story = {
  args: {
    variant: 'white',
    size: 'md',
    children: 'OUTLINE',
  },
};

export const Small: Story = {
  args: {
    variant: 'cyan',
    size: 'sm',
    children: 'SMALL_BTN',
  },
};

export const Medium: Story = {
  args: {
    variant: 'pink',
    size: 'md',
    children: 'MEDIUM_BTN',
  },
};

export const Large: Story = {
  args: {
    variant: 'yellow',
    size: 'lg',
    children: 'LARGE_BUTTON',
  },
};

export const Disabled: Story = {
  args: {
    variant: 'cyan',
    size: 'md',
    children: 'DISABLED',
    disabled: true,
  },
};

export const AllVariants: Story = {
  // `render` controls the output; args satisfy the required-prop type contract.
  args: { children: 'BUTTON' },
  render: () => (
    <div className="flex flex-col gap-4 items-center">
      <div className="flex gap-4 flex-wrap justify-center">
        <Button variant="cyan" size="md">
          CYAN
        </Button>
        <Button variant="pink" size="md">
          PINK
        </Button>
        <Button variant="yellow" size="md">
          YELLOW
        </Button>
        <Button variant="white" size="md">
          WHITE
        </Button>
      </div>
      <div className="flex gap-4 flex-wrap justify-center">
        <Button variant="cyan" size="sm">
          SMALL
        </Button>
        <Button variant="pink" size="md">
          MEDIUM
        </Button>
        <Button variant="yellow" size="lg">
          LARGE
        </Button>
      </div>
    </div>
  ),
};
