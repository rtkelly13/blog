import { useState } from 'react';
import Card from '@/components/Card';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

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

const CodePreview = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-3 py-1 bg-brutalist-cyan text-black font-mono text-xs font-bold border-2 border-white hover:bg-brutalist-pink transition-colors"
      >
        {copied ? '✓ COPIED' : 'COPY'}
      </button>
      <pre className="bg-black border-2 border-white p-4 overflow-x-auto text-xs font-mono text-brutalist-green">
        {code}
      </pre>
    </div>
  );
};

export default function Cards() {
  return (
    <>
      <PageSEO
        title={`Card Components - Design Sandbox - ${siteMetadata.author}`}
        description="Showcase of card component variations with different styles and options"
      />
      <div className="divide-y divide-white">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 font-mono uppercase border-2 border-white inline-block px-4 py-2">
            [ CARD_COMPONENTS ]
          </h1>
          <p className="text-lg leading-7 text-zinc-400 font-mono">
            {'>'} 6 variations of the brutalist card component
          </p>
        </div>

        <div className="container py-12 space-y-16">
          {cardVariations.map((variation) => (
            <div key={variation.id} className="space-y-4">
              {/* Variation Header */}
              <div className="border-l-4 border-brutalist-cyan pl-4">
                <h2 className="text-2xl font-mono font-bold text-white uppercase">
                  {String(variation.id).padStart(2, '0')}. {variation.name}
                </h2>
              </div>

              {/* Card Preview */}
              <div className="bg-black border-2 border-white p-8">
                <div className="flex justify-center">
                  <Card {...variation.props} />
                </div>
              </div>

              {/* Code Example */}
              <CodePreview
                code={`<Card
  title="${variation.props.title}"
  description="${variation.props.description}"${variation.props.href ? `\n  href="${variation.props.href}"` : ''}${variation.props.imgSrc ? `\n  imgSrc="${variation.props.imgSrc}"` : ''}${variation.props.asciiArt ? `\n  asciiArt="${variation.props.asciiArt}"` : ''}${variation.props.filename ? `\n  filename="${variation.props.filename}"` : ''}
/>`}
              />
            </div>
          ))}

          {/* Usage Notes */}
          <div className="border-2 border-brutalist-yellow bg-zinc-900 p-6 mt-12">
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
                  <strong className="text-white">asciiArt:</strong> Small ASCII
                  icon in header (e.g., {'"[//]"'}, {'"</>", "[!]"'})
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
                  Hover state: Border changes from white to cyan with cyan
                  shadow
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-brutalist-pink mr-2">*</span>
                <span>
                  Used in project listings, blog homepage, and tag pages
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
