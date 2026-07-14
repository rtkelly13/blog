import { Boxes, Rocket } from 'lucide-react';
import type { ReactNode } from 'react';
import Button from '@/components/Button';
import { IdeaKindBadge, IdeaStatusBadge } from '@/components/ideas/IdeaBadges';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import Tag from '@/components/Tag';
import TLDR from '@/components/TLDR';
import siteMetadata from '@/data/siteMetadata';

/**
 * Component library: every core component rendered in **both** first-class
 * themes at once, so the dual-mode design system is verifiable at a glance.
 *
 * Each panel forces its theme by carrying the theme class itself — the system
 * re-themes through CSS variables scoped to `.dark` / `.sketch`, so a nested
 * container with that class re-points the tokens for its subtree. `bg-black`
 * inside then resolves to the theme's surface (true black vs paper).
 */
function ThemePanel({
  theme,
  label,
  children,
}: {
  theme: 'dark' | 'sketch';
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={`${theme} border-2 border-white bg-black`}>
      <div className="border-b-2 border-white bg-zinc-900 px-3 py-1.5">
        <span className="font-mono text-xs font-bold uppercase text-zinc-400">
          {label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 p-6">{children}</div>
    </div>
  );
}

/** One specimen, shown twice (dark + sketch). */
function Specimen({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold uppercase text-white">
        [ {name} ]
      </h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <ThemePanel theme="dark" label="dark · neon terminal">
          {children}
        </ThemePanel>
        <ThemePanel theme="sketch" label="sketch · paper & ink">
          {children}
        </ThemePanel>
      </div>
    </section>
  );
}

export default function ComponentLibrary() {
  return (
    <>
      <PageSEO
        title={`Component Library - ${siteMetadata.author}`}
        description="Every core component rendered in both themes side by side"
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="COMPONENT_LIBRARY"
          icon={Boxes}
          subtitle="Every component in both themes, side by side"
        />
        <div className="space-y-12 px-6 py-10">
          <p className="max-w-2xl font-mono text-sm text-zinc-400">
            <span className="text-brutalist-cyan">&gt;</span> The design system
            ships two first-class looks from one token set. Each row proves a
            component reads as intentional in the neon-terminal dark mode{' '}
            <span className="text-brutalist-cyan">and</span> the paper-and-ink
            sketch mode.
          </p>

          <Specimen name="BUTTONS">
            <Button variant="cyan">CLICK_ME</Button>
            <Button variant="pink">EXECUTE</Button>
            <Button variant="yellow">SUBMIT</Button>
            <Button variant="white">OUTLINE</Button>
          </Specimen>

          <Specimen name="TAGS">
            <Tag text="aws" />
            <Tag text="coding agents" />
            <Tag text="monorepo" />
          </Specimen>

          <Specimen name="IDEA BADGES">
            <IdeaKindBadge kind="article" />
            <IdeaKindBadge kind="series" />
            <IdeaStatusBadge status="spark" />
            <IdeaStatusBadge status="developing" />
          </Specimen>

          <Specimen name="TL;DR BLOCK">
            <TLDR text="A short summary block that opens a post — themeable border and accent." />
          </Specimen>

          <Specimen name="LINKS">
            <Link
              href="#"
              className="font-mono font-bold text-brutalist-cyan underline hover:text-brutalist-pink"
            >
              an inline link
            </Link>
          </Specimen>
        </div>
      </div>
    </>
  );
}
