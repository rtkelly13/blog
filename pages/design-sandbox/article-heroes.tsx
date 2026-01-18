import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

const HeroMinimal = () => (
  <div className="relative w-full h-[60vh] bg-black border-2 border-white flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block bg-brutalist-cyan text-black font-bold px-2 py-1 mb-4 text-xs font-mono">
        STATUS: ONLINE
      </div>
      <h1 className="text-4xl md:text-6xl font-bold font-mono mb-6 text-white uppercase">
        RYAN_KELLY.DEV
      </h1>
      <p className="text-lg md:text-xl font-mono text-zinc-400">
        {'>'} Full-stack engineer & cloud architect
      </p>
    </div>
  </div>
);

const HeroGrid = () => (
  <div className="relative w-full h-[60vh] bg-black border-2 border-white overflow-hidden">
    <div
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage:
          'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    />
    <div className="relative z-10 h-full flex items-center justify-center px-6">
      <div>
        <div className="inline-block bg-brutalist-cyan text-black font-bold px-2 py-1 mb-4 text-xs font-mono">
          STATUS: ONLINE
        </div>
        <h1 className="text-3xl md:text-5xl font-bold font-mono mb-6 leading-tight text-white">
          HELLO_WORLD.
          <br />I BUILD{' '}
          <span className="text-brutalist-pink bg-brutalist-pink/10 px-1">
            SYSTEMS
          </span>
          .
        </h1>
        <p className="text-base md:text-lg font-mono text-zinc-400 leading-relaxed">
          {'>'} Full-stack engineer & cloud architect
          <br />
          {'>'} Writing about React, AWS, and vim configs
        </p>
      </div>
    </div>
  </div>
);

const HeroTerminal = () => (
  <div className="relative w-full h-[60vh] bg-black border-2 border-brutalist-cyan overflow-hidden">
    <div className="bg-brutalist-cyan text-black px-4 py-2 font-mono text-sm font-bold border-b-2 border-brutalist-cyan">
      ryan@localhost:~
    </div>
    <div className="p-6 font-mono text-sm">
      <p className="text-brutalist-cyan mb-2">$ whoami</p>
      <p className="text-white mb-4">Ryan Kelly - Full Stack Engineer</p>
      <p className="text-brutalist-cyan mb-2">$ cat skills.txt</p>
      <p className="text-white mb-4">
        React | TypeScript | AWS | Docker | .NET
        <br />
        Cloud Architecture | System Design
      </p>
      <p className="text-brutalist-cyan mb-2">$ status</p>
      <p className="text-white">
        {'>'} Ready to build
        <span className="animate-pulse">_</span>
      </p>
    </div>
  </div>
);

export default function ArticleHeroes() {
  return (
    <>
      <PageSEO
        title={`Article Heroes - ${siteMetadata.author}`}
        description="Minimal brutalist hero sections for article pages and content"
      />
      <div className="divide-y divide-white">
        <div className="pt-6 pb-8 space-y-2 md:space-y-5">
          <Link
            href="/design-sandbox"
            className="text-brutalist-cyan hover:text-brutalist-pink font-mono text-sm mb-4 inline-block"
          >
            {'<'} BACK_TO_SANDBOX
          </Link>
          <h1 className="text-3xl font-extrabold leading-9 tracking-tight text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 font-mono uppercase border-2 border-white inline-block px-4 py-2">
            [ ARTICLE_HEROES ]
          </h1>
          <p className="text-lg leading-7 text-zinc-400 font-mono">
            {'>'} Minimal brutalist aesthetic for content pages
          </p>
        </div>

        <div className="py-12 space-y-16">
          <div>
            <h2 className="font-mono font-bold text-2xl text-white mb-2 uppercase">
              01. MINIMAL_CENTERED
            </h2>
            <p className="text-zinc-400 font-mono text-sm mb-6">
              Clean centered layout with status badge
            </p>
            <div className="border-2 border-white">
              <HeroMinimal />
            </div>
          </div>

          <div>
            <h2 className="font-mono font-bold text-2xl text-white mb-2 uppercase">
              02. GRID_BACKGROUND
            </h2>
            <p className="text-zinc-400 font-mono text-sm mb-6">
              Brutalist grid pattern with status badge and tagline
            </p>
            <div className="border-2 border-white">
              <HeroGrid />
            </div>
          </div>

          <div>
            <h2 className="font-mono font-bold text-2xl text-white mb-2 uppercase">
              03. TERMINAL_INTERFACE
            </h2>
            <p className="text-zinc-400 font-mono text-sm mb-6">
              Command-line aesthetic with interactive prompt
            </p>
            <div className="border-2 border-brutalist-cyan">
              <HeroTerminal />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
