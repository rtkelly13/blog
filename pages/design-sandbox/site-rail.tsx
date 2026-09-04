import { Bookmark, Contrast, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { SITE_DIVIDERS, SiteRail } from '@/components/dividers';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * Site rail — the navigation foundation, as one component.
 *
 * Instead of a header: a column of vertical section tabs pinned tight to the
 * left edge, and beside it a second rail that always shows the open section's
 * pages. Rendered in **both** first-class themes at once so the dual-mode
 * claim is verifiable rather than asserted, and at two different locations so
 * the rail's two states — *here* and *open* — can be seen apart.
 *
 * Each panel forces its theme by carrying the theme class itself — the token
 * remap is scoped to `.dark` / `.sketch`, so a nested container with that class
 * re-points the tokens for its whole subtree. Same trick as
 * `/design-sandbox/component-library`.
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
      {/* No padding: the rail has to sit hard against the frame's own edge,
          because "tight to the left" is the thing being proposed. */}
      <div className="h-[36rem]">{children}</div>
    </div>
  );
}

/** Stand-ins for `SearchButton` and `ThemeSwitch` at rail width. */
function RailControls() {
  return (
    <>
      <button
        type="button"
        aria-label="Search the site"
        className="text-brutalist-cyan transition-colors hover:text-white"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Switch theme"
        className="text-zinc-400 transition-colors hover:text-white"
      >
        <Contrast className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );
}

/** A page, so the rail has something to be next to. */
function FakePost({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="space-y-3 p-6">
      <p className="font-display text-xl font-bold uppercase text-white">
        [ {title} ]
      </p>
      <p className="font-mono text-xs text-zinc-500">{meta}</p>
      <div className="space-y-2 pt-2" aria-hidden>
        {[100, 96, 88, 99, 72, 94, 90, 64].map((width, index) => (
          <div
            key={index}
            style={{ width: `${width}%` }}
            className="h-2 bg-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}

const Prompt = ({ children }: { children: ReactNode }) => (
  <p className="max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
    <span className="text-brutalist-cyan">&gt;</span> {children}
  </p>
);

export default function SiteRailSandbox() {
  return (
    <>
      <PageSEO
        title={`Site Rail - ${siteMetadata.author}`}
        description="A navigation foundation: a route-aware rail of vertical tabs tight to the left edge, instead of a header bar"
      />

      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="SITE_RAIL"
          icon={Bookmark}
          subtitle="Instead of a header — vertical tabs, tight to the left edge, with the section's pages beside them"
        />

        <div className="space-y-14 px-6 py-10">
          {/* ── The argument ─────────────────────────────────────────── */}
          <section className="space-y-4">
            <Prompt>
              A header bar is a row of links with nowhere to put anything else,
              and it charges the same band of height on every screenful for the
              privilege. The proposal is to take the navigation off the top and
              stand it up on its side: a column of{' '}
              <span className="text-white">vertical tabs</span>, hard against
              the left edge, the way index tabs run down the edge of a notebook.
            </Prompt>
            <Prompt>
              Six treatments were tried. This is the one that survived, and it
              is a merge of two of them: the <em>shell</em> that carried the
              whole header on one rail, and the <em>nested</em> rail that kept a
              section&rsquo;s pages permanently beside it. The shell alone made
              every navigation two clicks and a scrim over the article; the
              nested rail alone had no idea where the reader was. Together:
              every destination is one click, and the rail answers{' '}
              <span className="text-white">where am I</span> as well as{' '}
              <span className="text-white">where can I go</span>. It costs about
              5.25rem of width the reading measure was not using.
            </Prompt>

            <div className="border-2 border-brutalist-yellow bg-zinc-900 p-5">
              <h2 className="mb-3 font-display text-lg font-bold uppercase text-brutalist-yellow">
                [ TWO STATES, TWO DEVICES ]
              </h2>
              <p className="max-w-3xl font-mono text-sm leading-relaxed text-white">
                A rail can be open on a section the reader is only looking at,
                so <span className="text-brutalist-cyan">open</span> and{' '}
                <span className="text-brutalist-cyan">here</span> are different
                states and never share a device. <em>Here</em> is the solid
                accent fill — on the section tab and on the page, so section and
                page share one colour. <em>Open but elsewhere</em> is a 4px
                accent edge and full-strength text. Choosing a tab never
                navigates; the links do.
              </p>
              <p className="mt-3 max-w-3xl font-mono text-xs leading-relaxed text-zinc-400">
                Both devices are built on the accents, which stay saturated in
                every theme. Neither is a surface pair — `bg-black` against
                `bg-zinc-900` is a 3% lightness difference on paper, which is
                how the first version of this shipped invisible under sketch.
                The design-system package now asserts that rule as arithmetic in
                its contrast gate.
              </p>
            </div>
          </section>

          {/* ── The rail, twice ───────────────────────────────────────── */}
          <section id="rail" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-white">
                [ THE RAIL ]
              </h2>
              <Prompt>
                Left: a reader on a talk. Right: a reader on the idea workbench.
                Click any section tab — the pages beside it change, the location
                does not. Arrow keys move along the sections.
              </Prompt>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ThemePanel theme="dark" label="midnight — neon terminal">
                <SiteRail
                  dividers={SITE_DIVIDERS}
                  currentPath="/talks"
                  controls={<RailControls />}
                >
                  <FakePost
                    title="A TALK"
                    meta="2026-09-03 · 40 min · no header above it"
                  />
                </SiteRail>
              </ThemePanel>
              <ThemePanel theme="sketch" label="sketch — paper & ink">
                <SiteRail
                  dividers={SITE_DIVIDERS}
                  currentPath="/ideas"
                  controls={<RailControls />}
                >
                  <FakePost
                    title="AN IDEA"
                    meta="2026-09-03 · draft · no header above it"
                  />
                </SiteRail>
              </ThemePanel>
            </div>

            <div className="border-l-2 border-zinc-700 pl-4 font-mono text-xs leading-relaxed text-zinc-400">
              The section tabs are a vertical tablist with roving focus; the
              inner rail is its panel and holds a real nav of links.{' '}
              <span className="text-white">
                aria-current=&quot;location&quot;
              </span>{' '}
              marks the section the reader is in and{' '}
              <span className="text-white">aria-current=&quot;page&quot;</span>{' '}
              the page, independently of which tab is selected. Rotated text is
              read normally by a screen reader; the labels stay real text.
            </div>
          </section>

          {/* ── What was cut ──────────────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="font-display text-2xl font-bold uppercase text-white">
              [ WHAT WAS CUT, AND WHY ]
            </h2>
            <div className="overflow-x-auto border-2 border-white bg-zinc-900">
              <table className="w-full min-w-[42rem] font-mono text-xs">
                <thead>
                  <tr className="border-b-2 border-white text-left">
                    <th className="p-3 font-bold uppercase text-brutalist-cyan">
                      Treatment
                    </th>
                    <th className="p-3 font-bold uppercase text-brutalist-cyan">
                      Why it did not survive
                    </th>
                  </tr>
                </thead>
                <tbody className="text-zinc-400">
                  {[
                    [
                      'Shell',
                      'Two clicks and a scrim for every navigation; open and here were the same state. Its wordmark and controls live on here.',
                    ],
                    [
                      'Nested',
                      'The right geometry with no location. Merged into this.',
                    ],
                    [
                      'Flush / Split',
                      'The same rail with a panel instead of a second rail — the panel is the dropdown the header already has.',
                    ],
                    ['Protrude', 'A tab half off the screen is half a target.'],
                    [
                      'Sliver',
                      'Nine pixels of colour is an unlabelled nav; colour-only selection fails anyone who cannot tell the accents apart.',
                    ],
                    [
                      'Blades (7)',
                      'The geometry exploration. Fans, folds and stacks are furniture, not navigation; the top ribbon is the header with a drop, which the header can grow on its own.',
                    ],
                    [
                      'Code tabs',
                      'Not navigation at all — a content switcher. Moved to the design-system package as CodeTabs, in --ds-* roles.',
                    ],
                  ].map(([name, why]) => (
                    <tr
                      key={name}
                      className="border-b border-zinc-700 last:border-b-0"
                    >
                      <td className="p-3 font-bold text-white">{name}</td>
                      <td className="p-3">{why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── What shipping this would take ─────────────────────────── */}
          <section className="space-y-3 border-2 border-white bg-zinc-900 p-5">
            <h2 className="font-display text-lg font-bold uppercase text-white">
              [ BEFORE THIS REPLACES THE HEADER ]
            </h2>
            <ul className="space-y-2 font-mono text-xs leading-relaxed text-zinc-400">
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Fixed to the
                viewport. This is a box in a sandbox; the real rail is{' '}
                <span className="text-white">position: fixed</span> down the
                left, the page scrolls independently, and the reading column is
                re-centred against the remaining width rather than the viewport
                — at 1280px the tags page&rsquo;s 7xl measure meets the rail.
              </li>
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Small
                viewports. A vertical rail needs height. Below{' '}
                <span className="text-white">lg</span> the existing burger
                drawer stays — the rail is the desktop shape, not the only shape
                — which means two navigation systems until one is retired.
              </li>
              <li>
                <span className="text-brutalist-cyan">&gt;</span> The controls.{' '}
                <span className="text-white">SearchButton</span> is a bordered
                field with a ⌘K key cap and{' '}
                <span className="text-white">ThemeSwitch</span> has three
                glyphs; the stand-ins here are icons. Both need a rail-width
                form, and Escape / focus-return from{' '}
                <span className="text-white">useDrawer</span> if anything ever
                slides out again.
              </li>
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Semantic
                roles. This speaks the blog&rsquo;s vocabulary (
                <span className="text-white">brutalist-*</span>,{' '}
                <span className="text-white">zinc-*</span>) and its two themes;
                the package addresses <span className="text-white">--ds-*</span>{' '}
                roles across a four-rung ladder. Promoting the rail means a pass
                over every class, and a decision about per-section colour — the
                ladder has hierarchy roles, not identity roles.
              </li>
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Visual
                baselines. Replacing the chrome re-baselines every page snapshot
                in <span className="text-white">tests/visual.spec.ts</span>.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
