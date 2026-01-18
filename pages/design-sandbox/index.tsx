import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

const components = [
  {
    name: 'Homepage Heroes',
    path: '/design-sandbox/homepage-heroes',
    description: 'Synth wave heroes for landing pages',
    icon: '🌅',
  },
  {
    name: 'Article Heroes',
    path: '/design-sandbox/article-heroes',
    description: 'Minimal heroes for content pages',
    icon: '📄',
  },
  {
    name: 'Diagrams',
    path: '/design-sandbox/diagrams',
    description: 'Mermaid diagram style variations',
    icon: '📊',
  },
  {
    name: 'Buttons',
    path: '/design-sandbox/buttons',
    description: 'All button variations and states',
    icon: '🔘',
  },
  {
    name: 'Cards',
    path: '/design-sandbox/cards',
    description: 'Different card layouts and styles',
    icon: '🃏',
  },
  {
    name: 'Typography',
    path: '/design-sandbox/typography',
    description: 'Font styles, headings, and text treatments',
    icon: '📝',
  },
  {
    name: 'Logos',
    path: '/design-sandbox/logos',
    description: 'ASCII art logo variations',
    icon: '🏷️',
  },
  {
    name: 'Navigation',
    path: '/design-sandbox/navigation',
    description: 'FAB interaction patterns and triggers',
    icon: '🧭',
  },
];

export default function DesignSandbox() {
  return (
    <>
      <PageSEO
        title={`Design Sandbox - ${siteMetadata.author}`}
        description="Component showcase and design system playground"
      />
      <div className="divide-y divide-white">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 font-mono uppercase border-2 border-white inline-block px-4 py-2">
            [ DESIGN_SANDBOX ]
          </h1>
          <p className="text-lg leading-7 text-zinc-400 font-mono">
            {'>'} Component variations and design system showcase
          </p>
        </div>

        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {components.map((component) => (
              <Link key={component.path} href={component.path}>
                <div className="bg-zinc-900 border-2 border-white p-6 hover:border-brutalist-cyan transition-all shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:shadow-[12px_12px_0px_0px_rgba(34,211,238,1)] active:translate-x-1 active:translate-y-1 h-full cursor-pointer group">
                  <div className="text-4xl mb-4">{component.icon}</div>
                  <h3 className="font-mono font-bold text-xl text-white mb-2 uppercase group-hover:text-brutalist-cyan transition-colors">
                    {component.name}
                  </h3>
                  <p className="text-zinc-400 font-mono text-sm">
                    {component.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 border-2 border-brutalist-yellow bg-zinc-900 p-6">
            <h2 className="font-mono font-bold text-xl text-brutalist-yellow mb-4 uppercase">
              [ SANDBOX_INFO ]
            </h2>
            <p className="text-white font-mono text-sm leading-relaxed mb-4">
              This is a living design system showcase. Each component page
              displays multiple variations that can be used throughout the site.
            </p>
            <p className="text-zinc-400 font-mono text-sm">
              {'>'} Click any component to view its variations
              <br />
              {'>'} Use these as references for consistent design
              <br />
              {'>'} All components follow the brutalist ASCII aesthetic
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
