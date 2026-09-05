import { SquareCode } from 'lucide-react';
import type { ReactNode } from 'react';
import { CodeTab, CodeTabs } from '@/components/dividers';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import Pre from '@/components/Pre';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * Code tabs — the top-aligned family.
 *
 * The left-hand notebook rail is navigation; this is a content switcher, and
 * the two are separate components because they are separate contracts. The
 * rail is a set of disclosure buttons announcing `aria-expanded`; this is a
 * real `tablist` with roving focus and arrow-key traversal, and the panels are
 * the same content in a different form.
 *
 * Snippets here are plain text in `Pre` rather than MDX fences: this page is a
 * `.tsx` route, so it never goes through the rehype pipeline and there is no
 * syntax highlighting. The chrome is exactly what a post gets.
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
      <div className="p-4">{children}</div>
    </div>
  );
}

function Variation({
  id,
  name,
  tagline,
  notes,
  render,
}: {
  id: string;
  name: string;
  tagline: string;
  notes: ReactNode;
  render: () => ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold uppercase text-white">
          [ {name} ]
        </h2>
        <p className="mt-1 max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
          <span className="text-brutalist-cyan">&gt;</span> {tagline}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ThemePanel theme="dark" label="midnight — neon terminal">
          {render()}
        </ThemePanel>
        <ThemePanel theme="sketch" label="sketch — paper & ink">
          {render()}
        </ThemePanel>
      </div>

      <div className="border-l-2 border-zinc-700 pl-4 font-mono text-xs leading-relaxed text-zinc-400">
        {notes}
      </div>
    </section>
  );
}

/** A stand-in for the highlighted `<pre>` a real MDX fence produces. */
function Snippet({ children }: { children: string }) {
  return (
    <Pre>
      <code>{children}</code>
    </Pre>
  );
}

const INSTALL = {
  pnpm: 'pnpm add @rtkelly13/design-system',
  npm: 'npm install @rtkelly13/design-system',
  yarn: 'yarn add @rtkelly13/design-system',
};

const USAGE = {
  TypeScript: `import { Button } from '@rtkelly13/design-system'

export const Save = () => <Button variant="cyan">SAVE</Button>`,
  CSS: `@import "tailwindcss";
@import "@rtkelly13/design-system/theme.css";`,
};

function InstallTabs({
  variant,
  group,
  label,
}: {
  variant: 'merged' | 'underline' | 'segmented';
  group?: string;
  label?: string;
}) {
  return (
    <CodeTabs variant={variant} group={group} label={label}>
      <CodeTab label="pnpm">
        <Snippet>{INSTALL.pnpm}</Snippet>
      </CodeTab>
      <CodeTab label="npm">
        <Snippet>{INSTALL.npm}</Snippet>
      </CodeTab>
      <CodeTab label="yarn">
        <Snippet>{INSTALL.yarn}</Snippet>
      </CodeTab>
    </CodeTabs>
  );
}

export default function CodeTabsSandbox() {
  return (
    <>
      <PageSEO
        title={`Code Tabs - ${siteMetadata.author}`}
        description="Top-aligned tabs: a code block language switcher, the way developer documentation portals do it"
      />

      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="CODE_TABS"
          icon={SquareCode}
          subtitle="Top-aligned tabs — the code block language switcher"
        />

        <div className="space-y-14 px-6 py-10">
          {/* ── Why this is a separate mechanism ──────────────────────── */}
          <section className="space-y-4">
            <p className="max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> The{' '}
              <Link
                href="/design-sandbox/notebook-tabs"
                className="font-bold text-brutalist-cyan underline hover:text-brutalist-pink"
              >
                notebook rail
              </Link>{' '}
              is navigation. This is a{' '}
              <span className="text-white">content switcher</span>: the same
              instruction in a different tool, sitting on top of the block it
              belongs to, the way every developer documentation portal does a
              package-manager or language picker.
            </p>
            <p className="max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> They are
              separate components because they are separate contracts, and one
              with an <span className="text-white">orientation</span> prop would
              hide that. The rail is a set of disclosure buttons announcing{' '}
              <span className="text-white">aria-expanded</span>, one section
              open at a time, links inside. This is a real{' '}
              <span className="text-white">tablist</span>: roving focus,
              arrow-key / Home / End traversal, panels that stay in the document
              so a crawler still sees every variant of the snippet.
            </p>

            <div className="border-2 border-brutalist-yellow bg-zinc-900 p-5">
              <h2 className="mb-3 font-display text-lg font-bold uppercase text-brutalist-yellow">
                [ THE PART THAT EARNS IT — GROUP SYNC ]
              </h2>
              <p className="max-w-3xl font-mono text-sm leading-relaxed text-white">
                A reader picks a package manager{' '}
                <span className="text-brutalist-cyan">once</span>, not once per
                snippet. Blocks sharing a{' '}
                <span className="text-brutalist-cyan">group</span> switch
                together, and the choice is remembered across pages. The
                selection lives in a module-level store rather than a context,
                because MDX mounts these at arbitrary depths and there is no
                component in a post to hang a provider off.
              </p>
              <p className="mt-3 max-w-3xl font-mono text-xs leading-relaxed text-zinc-400">
                Try it below: the two blocks in{' '}
                <span className="text-white">GROUP SYNC</span> are in the same
                group, and so is the install block in every variation above them
                — switching any one switches all of them, in both theme panels
                at once.
              </p>
            </div>
          </section>

          {/* ── Variants ──────────────────────────────────────────────── */}
          <Variation
            id="merged"
            name="01 — MERGED"
            tagline="The default and the loudest: the open tab is a solid block of accent standing on the code block, its bottom rule dropped so the fill runs into it."
            render={() => <InstallTabs variant="merged" group="pkg" />}
            notes={
              <>
                It started out marking the open tab with a surface swap —
                <span className="text-white"> bg-black</span> against{' '}
                <span className="text-white">bg-zinc-900</span> — which is a 3%
                lightness difference on paper and told a reader nothing. The
                accent fill is the same device the{' '}
                <span className="text-white">Flush</span> rail uses, and the
                reason that one always read.
              </>
            }
          />

          <Variation
            id="underline"
            name="02 — UNDERLINE"
            tagline="The quiet one: no tab shapes at all, just labels — a 4px accent rule on the seam and the open label at full strength against muted siblings."
            render={() => <InstallTabs variant="underline" group="pkg" />}
            notes={
              <>
                The quietest of the three and the one that scales furthest — a
                row of eight languages reads as a row of eight words rather than
                eight boxes. Least brutalist, which is the argument against it
                here.
              </>
            }
          />

          <Variation
            id="segmented"
            name="03 — SEGMENTED"
            tagline="A title bar: the filename on the left, a bordered segmented control on the right whose chosen segment is a solid block of accent. The most developer-portal of the three, and the only one with somewhere to put a caption."
            render={() => (
              <InstallTabs variant="segmented" group="pkg" label="install.sh" />
            )}
            notes={
              <>
                Reuses the slot the existing{' '}
                <span className="text-white">remark-code-title</span> bar
                occupies, so a block that already has a title has one bar rather
                than two stacked. The one to pick if these ever need to carry a
                filename as well as a language.
              </>
            }
          />

          {/* ── Group sync, demonstrated ──────────────────────────────── */}
          <section id="group-sync" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-white">
                [ 04 — GROUP SYNC ]
              </h2>
              <p className="mt-1 max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
                <span className="text-brutalist-cyan">&gt;</span> Two blocks in
                one group. Switch either and the other follows — as does every
                install block further up the page, and the same block on the
                next page you open.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ThemePanel theme="dark" label="midnight — neon terminal">
                <InstallTabs variant="merged" group="pkg" />
                <InstallTabs variant="underline" group="pkg" />
              </ThemePanel>
              <ThemePanel theme="sketch" label="sketch — paper & ink">
                <InstallTabs variant="merged" group="pkg" />
                <InstallTabs variant="underline" group="pkg" />
              </ThemePanel>
            </div>

            <div className="border-l-2 border-zinc-700 pl-4 font-mono text-xs leading-relaxed text-zinc-400">
              A group can be shared by blocks whose tab sets differ —{' '}
              <span className="text-white">pnpm | npm</span> in one and{' '}
              <span className="text-white">pnpm | npm | yarn</span> in another.
              A block falls back to its own first tab rather than rendering
              empty when the group&rsquo;s choice is not on offer.
            </div>
          </section>

          {/* ── Ungrouped ─────────────────────────────────────────────── */}
          <Variation
            id="ungrouped"
            name="05 — UNGROUPED"
            tagline="Omit the group and the block keeps its own local state: for tabs that mean nothing to the rest of the page, like one snippet shown in two languages."
            render={() => (
              <CodeTabs variant="merged">
                <CodeTab label="TypeScript">
                  <Snippet>{USAGE.TypeScript}</Snippet>
                </CodeTab>
                <CodeTab label="CSS">
                  <Snippet>{USAGE.CSS}</Snippet>
                </CodeTab>
              </CodeTabs>
            )}
            notes={
              <>
                Nothing else on the page moves when this one switches — which is
                the whole difference, and the reason{' '}
                <span className="text-white">group</span> is opt-in rather than
                automatic.
              </>
            }
          />

          {/* ── Using it ──────────────────────────────────────────────── */}
          <section className="space-y-3 border-2 border-white bg-zinc-900 p-5">
            <h2 className="font-display text-lg font-bold uppercase text-white">
              [ IN A POST ]
            </h2>
            <p className="max-w-3xl font-mono text-xs leading-relaxed text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> Registered in{' '}
              <span className="text-white">MDXComponents</span>, so it is
              available in any post, talk or idea with no import. The blank
              lines around the fences are load-bearing: MDX only parses markdown
              inside a JSX block when the block opens and closes on its own
              lines.
            </p>
            <Pre>
              <code>{`<CodeTabs group="pkg">
  <CodeTab label="pnpm">

    \`\`\`bash
    pnpm add @rtkelly13/design-system
    \`\`\`

  </CodeTab>
  <CodeTab label="npm">

    \`\`\`bash
    npm install @rtkelly13/design-system
    \`\`\`

  </CodeTab>
</CodeTabs>`}</code>
            </Pre>
            <ul className="space-y-2 pt-1 font-mono text-xs leading-relaxed text-zinc-400">
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Inside a post
                the panels hold real fences, so they keep{' '}
                <span className="text-white">rehype-prism-plus</span>{' '}
                highlighting and <span className="text-white">Pre</span>&rsquo;s
                own hover copy button — this page shows the chrome with plain
                text, because a `.tsx` route never goes through that pipeline.
              </li>
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Still to
                settle before it goes in a post:{' '}
                <span className="text-white">prefers-reduced-motion</span> is a
                non-issue here (nothing animates but colour), but the persisted
                choice needs a decision — remembering a package manager across
                pages is the point, remembering a{' '}
                <span className="text-white">language</span> choice across
                unrelated posts may not be.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
