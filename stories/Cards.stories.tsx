import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Card from '../components/Card';

const meta = {
  title: 'Design Sandbox/Cards',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

const cardVariations = [
  {
    id: 1,
    name: 'Basic Card (No Image)',
    props: {
      title: 'Basic Card',
      description:
        'Simple card with title, description, and link. No image or ASCII art.',
      href: '#',
      filename: 'basic_card.md',
    },
  },
  {
    id: 2,
    name: 'Card with Image',
    props: {
      title: 'Card with Image',
      description:
        'Full-featured card with image, title, description, and call to action.',
      imgSrc: '/static/images/time-machine.jpg',
      href: '#',
      filename: 'featured_post.md',
    },
  },
  {
    id: 3,
    name: 'Card with ASCII Art',
    props: {
      title: 'Terminal Interface',
      description:
        'Card showcasing ASCII art in the header alongside filename.',
      href: '#',
      asciiArt: '[//]',
      filename: 'terminal.sh',
    },
  },
  {
    id: 4,
    name: 'Card with Image + ASCII',
    props: {
      title: 'Full Stack Build',
      description: 'Complete card with image, ASCII art header, and content.',
      imgSrc: '/static/images/canada/mountains.jpg',
      href: '#',
      asciiArt: '</>',
      filename: 'full_stack.tsx',
    },
  },
  {
    id: 5,
    name: 'No Link Card',
    props: {
      title: 'Static Content',
      description:
        'Card without a link - useful for displaying non-interactive content or coming soon items.',
      filename: 'placeholder.md',
    },
  },
  {
    id: 6,
    name: 'Long Content',
    props: {
      title: 'Deep Dive: Advanced React Patterns',
      description:
        'A comprehensive exploration of advanced React patterns including compound components, render props, controlled components, custom hooks, and state management strategies for complex applications.',
      href: '#',
      asciiArt: '[!]',
      filename: 'react_advanced.mdx',
    },
  },
];

export const BasicCard: Story = {
  args: {
    title: 'Basic Card',
    description:
      'Simple card with title, description, and link. No image or ASCII art.',
    href: '#',
    filename: 'basic_card.md',
  },
};

export const WithImage: Story = {
  args: {
    title: 'Card with Image',
    description:
      'Full-featured card with image, title, description, and call to action.',
    imgSrc: '/static/images/time-machine.jpg',
    href: '#',
    filename: 'featured_post.md',
  },
};

export const WithASCII: Story = {
  args: {
    title: 'Terminal Interface',
    description: 'Card showcasing ASCII art in the header alongside filename.',
    href: '#',
    asciiArt: '[//]',
    filename: 'terminal.sh',
  },
};

export const FullFeatured: Story = {
  args: {
    title: 'Full Stack Build',
    description: 'Complete card with image, ASCII art header, and content.',
    imgSrc: '/static/images/canada/mountains.jpg',
    href: '#',
    asciiArt: '</>',
    filename: 'full_stack.tsx',
  },
};

export const NoLink: Story = {
  args: {
    title: 'Static Content',
    description:
      'Card without a link - useful for displaying non-interactive content or coming soon items.',
    filename: 'placeholder.md',
  },
};

// Render-only showcase: composes its own markup, so it doesn't drive component args.
export const AllVariations: StoryObj = {
  render: () => (
    <div className="space-y-8 p-8">
      <div className="border-b-2 border-white pb-4">
        <h1 className="text-3xl font-extrabold text-white font-mono uppercase border-2 border-white inline-block px-4 py-2">
          [ CARD_COMPONENTS ]
        </h1>
        <p className="text-lg text-zinc-400 font-mono mt-4">
          {'>'} 6 variations of the brutalist card component
        </p>
      </div>

      <div className="space-y-16">
        {cardVariations.map((variation) => (
          <div key={variation.id} className="space-y-4">
            <div className="border-l-4 border-brutalist-cyan pl-4">
              <h2 className="text-2xl font-mono font-bold text-white uppercase">
                {String(variation.id).padStart(2, '0')}. {variation.name}
              </h2>
            </div>

            <div className="bg-black border-2 border-white p-8">
              <div className="flex justify-center">
                <Card {...variation.props} />
              </div>
            </div>

            <div className="bg-black border-2 border-white p-4">
              <pre className="font-mono text-xs text-brutalist-green whitespace-pre-wrap">
                {`<Card
  title="${variation.props.title}"
  description="${variation.props.description}"${variation.props.href ? `\n  href="${variation.props.href}"` : ''}${variation.props.imgSrc ? `\n  imgSrc="${variation.props.imgSrc}"` : ''}${variation.props.asciiArt ? `\n  asciiArt="${variation.props.asciiArt}"` : ''}${variation.props.filename ? `\n  filename="${variation.props.filename}"` : ''}
/>`}
              </pre>
            </div>
          </div>
        ))}
      </div>

      <div className="border-2 border-brutalist-yellow bg-zinc-900 p-6">
        <h3 className="font-mono font-bold text-xl text-brutalist-yellow uppercase mb-4">
          [ USAGE_NOTES ]
        </h3>
        <ul className="space-y-2 font-mono text-sm text-zinc-300">
          <li className="flex items-start">
            <span className="text-brutalist-cyan mr-2">&gt;</span>
            <span>
              <strong className="text-white">filename:</strong> Displays in
              header bar (defaults to title-based slug)
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-brutalist-cyan mr-2">&gt;</span>
            <span>
              <strong className="text-white">asciiArt:</strong> Small ASCII icon
              in header (e.g., {'"[//]"'}, {'"</>", "[!]"'})
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-brutalist-cyan mr-2">&gt;</span>
            <span>
              <strong className="text-white">imgSrc:</strong> Featured image
              (auto-cropped to 16:9)
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-brutalist-cyan mr-2">&gt;</span>
            <span>
              <strong className="text-white">href:</strong> Makes card
              clickable, adds "READ_MORE" link
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-brutalist-pink mr-2">*</span>
            <span>
              Hover state: Border changes from white to cyan with cyan shadow
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-brutalist-pink mr-2">*</span>
            <span>Used in project listings, blog homepage, and tag pages</span>
          </li>
        </ul>
      </div>
    </div>
  ),
};
