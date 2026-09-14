export interface FooterNavColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface ColossalFooterProps {
  brand?: string;
  signoff?: string;
  columns?: FooterNavColumn[];
  className?: string;
}

const DEFAULT_COLUMNS: FooterNavColumn[] = [
  {
    title: 'DISPATCHES',
    links: [
      { label: 'All Essays', href: '/blog' },
      { label: 'Curriculum Tracks', href: '/tracks' },
      { label: 'Technical Talks', href: '/talks' },
      { label: 'Research Lab', href: '/ideas' },
    ],
  },
  {
    title: 'PROJECTS',
    links: [
      {
        label: 'Parquet.SourceGenerator',
        href: 'https://github.com/rtkelly13/Parquet.SourceGenerator',
      },
      {
        label: 'Parquet.TypeProvider',
        href: 'https://github.com/rtkelly13/Parquet.TypeProvider',
      },
      {
        label: 'Resultful (ROP)',
        href: 'https://github.com/rtkelly13/Resultful',
      },
      {
        label: 'Mermaid Toolkit',
        href: 'https://github.com/rtkelly13/mermaid-toolkit',
      },
    ],
  },
  {
    title: 'ESTATE // INFRA',
    links: [
      { label: 'Design System', href: 'https://design.ryankelly.dev' },
      { label: 'Obsidian Vault', href: '/vault' },
      { label: 'Source Monorepo', href: 'https://github.com/rtkelly13' },
      { label: 'RSS Feed', href: '/feed.xml' },
    ],
  },
];

/**
 * Editorial Colossal Footer Signature Component.
 *
 * Implements a calibrated display-scale signoff with brutalist prompt badges,
 * categorized monospace link columns, and colophon metadata. Calibrated
 * to clamp(1.5rem, 3.8vw, 3.25rem) to ensure punchy presence without
 * overwhelming page navigation.
 */
export default function ColossalFooter({
  brand = 'RYAN KELLY',
  signoff = 'ENGINEERING HIGH-THROUGHPUT SYSTEMS & RETRO-BRUTALIST CODEBASES',
  columns = DEFAULT_COLUMNS,
  className = '',
}: ColossalFooterProps) {
  return (
    <footer
      data-slot="colossal-footer"
      className={`border-t-2 border-white bg-black font-mono text-white pt-12 pb-8 px-6 mt-16 shadow-hard-lg ${className}`}
    >
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Brand Display Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-sm font-black bg-accent-primary text-black">
              &gt;_
            </span>
            <h2
              className="font-black tracking-tighter uppercase text-white"
              style={{
                fontSize: 'clamp(1.5rem, 3.8vw, 3.25rem)',
                lineHeight: 0.95,
              }}
            >
              {brand}
            </h2>
            <span className="inline-block w-2.5 h-6 bg-accent-primary animate-pulse" />
          </div>
          <p className="text-xs text-zinc-400 max-w-xl font-medium tracking-wide">
            {signoff}
          </p>
        </div>

        {/* 3-Column Navigation Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-6 border-t-2 border-white/20">
          {columns.map((col) => (
            <div key={col.title} className="space-y-3">
              <h3 className="text-xs font-black tracking-wider text-accent-secondary uppercase">
                [ {col.title} ]
              </h3>
              <ul className="space-y-2 text-xs">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-zinc-400 hover:text-white hover:underline transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Colophon Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10 text-[11px] text-zinc-500">
          <div>
            {
              'RYANKELLY.DEV // EST. 2026 // RETRO-BRUTALIST MONOSPACE ARCHITECTURE'
            }
          </div>
          <div className="flex items-center gap-4">
            <span>ALL RIGHTS RESERVED</span>
            <span>WCAG AAA COMPLIANT</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
