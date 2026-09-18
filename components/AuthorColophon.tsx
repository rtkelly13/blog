import { ArrowUpRight, Code2, Globe, Rss, Share2 } from 'lucide-react';

export interface ColophonLink {
  label: string;
  href: string;
  icon?: 'code' | 'globe' | 'share' | 'rss' | 'external';
}

export interface AuthorColophonProps {
  authorName?: string;
  authorRole?: string;
  bio?: string;
  sectionMarker?: string; // e.g. "§"
  links?: ColophonLink[];
  className?: string;
}

const ICON_MAP = {
  code: Code2,
  globe: Globe,
  share: Share2,
  rss: Rss,
  external: ArrowUpRight,
};

/**
 * Editorial Author Endnote Colophon Card.
 *
 * Implements a literary/technical signoff card placed at the end of essays.
 * Features a prominent section mark (§), monospace bio block, and brutalist
 * action chips with inverted-hover states.
 */
export default function AuthorColophon({
  authorName = 'RYAN KELLY',
  authorRole = 'STAFF ENGINEER // DISTRIBUTED SYSTEMS & TOOLING',
  bio = 'I build high-throughput data engines, compiler extensions, and retro-brutalist developer tooling. Author of Parquet.SourceGenerator, Parquet.TypeProvider, and Resultful.',
  sectionMarker = '§',
  links = [
    { label: 'GITHUB', href: 'https://github.com/rtkelly13', icon: 'code' },
    { label: 'BLOG', href: 'https://ryankelly.dev', icon: 'globe' },
    { label: 'SHARE', href: 'https://twitter.com', icon: 'share' },
    { label: 'RSS FEED', href: '/feed.xml', icon: 'rss' },
  ],
  className = '',
}: AuthorColophonProps) {
  return (
    <aside
      data-slot="author-colophon"
      className={`border-2 border-white bg-black font-mono text-white p-6 shadow-hard-md relative overflow-hidden ${className}`}
    >
      {/* Background oversized section watermark */}
      <div
        className="absolute -right-2 -bottom-6 text-9xl font-black text-white/5 select-none pointer-events-none font-serif"
        aria-hidden="true"
      >
        {sectionMarker}
      </div>

      <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
        {/* Section glyph marker box */}
        <div className="w-12 h-12 shrink-0 border-2 border-accent-primary bg-zinc-950 flex items-center justify-center text-accent-primary font-black text-2xl shadow-hard-sm">
          {sectionMarker}
        </div>

        {/* Content & Bio block */}
        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black tracking-widest text-white uppercase">
                {authorName}
              </h4>
              <span className="w-1.5 h-3 bg-accent-primary animate-pulse" />
            </div>
            <div className="text-xs font-bold text-accent-secondary">
              {authorRole}
            </div>
          </div>

          <p className="font-sans text-sm text-zinc-300 leading-relaxed max-w-2xl">
            {bio}
          </p>

          {/* Action Chips */}
          <div className="flex flex-wrap gap-2 pt-2">
            {links.map((link) => {
              const Icon = link.icon ? ICON_MAP[link.icon] : ArrowUpRight;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/40 bg-zinc-950 text-xs font-bold text-white hover:bg-white hover:text-black hover:border-white transition-all shadow-hard-sm hover:-translate-x-0.5 hover:-translate-y-0.5"
                >
                  <Icon size={12} className="group-hover:stroke-[2.5]" />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
