import { Bookmark } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  FlushTabs,
  NestedTabs,
  ProtrudeTabs,
  SITE_DIVIDERS,
  SliverTabs,
  SplitTabs,
  TabbedShell,
} from '@/components/dividers';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * Notebook tabs — the navigation foundation.
 *
 * Instead of a header: a column of vertical tabs pinned tight to the left edge
 * of the screen, the way index tabs run down the edge of a notebook. Six
 * treatments of one rail, each rendered in **both** first-class themes at once
 * so the dual-mode claim is verifiable rather than asserted.
 *
 * Every panel forces its theme by carrying the theme class itself — the token
 * remap is scoped to `.dark` / `.sketch`, so a nested container with that
 * class re-points the tokens for its whole subtree. Same trick as
 * `/design-sandbox/component-library`.
 */

function ThemePanel({
  theme,
  label,
  frame,
  children,
}: {
  theme: 'dark' | 'sketch';
  label: string;
  frame: string;
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
      <div className={frame}>{children}</div>
    </div>
  );
}

/**
 * One treatment, shown twice. `render` is a function rather than a node so
 * each theme gets its own component instance — you can leave the two panels on
 * different tabs and compare states, not just palettes.
 */
function Variation({
  id,
  name,
  tagline,
  frame = 'h-[26rem]',
  notes,
  render,
}: {
  id: string;
  name: string;
  tagline: string;
  frame?: string;
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
        <ThemePanel theme="dark" label="midnight — neon terminal" frame={frame}>
          {render()}
        </ThemePanel>
        <ThemePanel theme="sketch" label="sketch — paper & ink" frame={frame}>
          {render()}
        </ThemePanel>
      </div>

      <div className="border-l-2 border-zinc-700 pl-4 font-mono text-xs leading-relaxed text-zinc-400">
        {notes}
      </div>
    </section>
  );
}

export default function NotebookTabsSandbox() {
  return (
    <>
      <PageSEO
        title={`Notebook Tabs - ${siteMetadata.author}`}
        description="A navigation foundation: vertical notebook tabs tight to the left edge, instead of a header bar"
      />

      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="NOTEBOOK_TABS"
          icon={Bookmark}
          subtitle="Instead of a header — vertical tabs, tight to the left edge"
        />

        <div className="space-y-14 px-6 py-10">
          {/* ── The argument ─────────────────────────────────────────── */}
          <section className="space-y-4">
            <p className="max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> A header bar is
              a row of links with nowhere to put anything else, and it charges
              the same band of height on every screenful for the privilege. The
              proposal is to take the navigation off the top and stand it up on
              its side: a column of{' '}
              <span className="text-white">vertical tabs</span>, hard against
              the left edge, the way index tabs run down the edge of a notebook.
            </p>
            <p className="max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> The trade is a
              good one for a blog. A rail costs about{' '}
              <span className="text-white">3rem of width</span> — which a
              reading measure was never using — and gives back the whole
              horizontal band a sticky header takes out of the top of the
              viewport. It also has the one thing the bar never had: room. A tab
              can hold its section&rsquo;s destinations, a line of copy and an
              accent of its own without a dropdown.
            </p>

            <div className="border-2 border-brutalist-yellow bg-zinc-900 p-5">
              <h2 className="mb-3 font-display text-lg font-bold uppercase text-brutalist-yellow">
                [ ONE MODEL, TWO LANGUAGES ]
              </h2>
              <p className="max-w-3xl font-mono text-sm leading-relaxed text-white">
                Nothing below branches on the theme. Every treatment is built on
                the remapped tokens only —{' '}
                <span className="text-brutalist-cyan">bg-black</span>,{' '}
                <span className="text-brutalist-cyan">border-white</span>,{' '}
                <span className="text-brutalist-cyan">bg-zinc-900</span>,{' '}
                <span className="text-brutalist-cyan">text-brutalist-*</span> —
                so the identical markup reads as a lit side-rail on midnight and
                as a set of paper index tabs under sketch. Same tab, different
                material.
              </p>
              <p className="mt-3 max-w-3xl font-mono text-xs leading-relaxed text-zinc-400">
                That is the test each panel pair below is running. If a
                treatment only works on one side, it is not a foundation — it is
                a dark-mode flourish. The shared contract is{' '}
                <span className="text-brutalist-yellow">Divider</span> — id, tab
                label, hint, accent, links — and every rail renders the same
                array.
              </p>
            </div>
          </section>

          {/* ── The shell: the proposal as a page ──────────────────────── */}
          <section id="shell" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-white">
                [ 01 — SHELL ]
              </h2>
              <p className="mt-1 max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
                <span className="text-brutalist-cyan">&gt;</span> The proposal
                as a page rather than a specimen: no header bar at all. The rail
                carries everything the header used to, top to bottom — wordmark,
                sections, then search and the theme switch pinned to the foot.
                Choosing a section slides a panel out over the page; choosing it
                again shuts it. The reading column never moves.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ThemePanel
                theme="dark"
                label="midnight — neon terminal"
                frame="h-[32rem]"
              >
                <TabbedShell dividers={SITE_DIVIDERS} initialIndex={0} />
              </ThemePanel>
              <ThemePanel
                theme="sketch"
                label="sketch — paper & ink"
                frame="h-[32rem]"
              >
                <TabbedShell dividers={SITE_DIVIDERS} initialIndex={2} />
              </ThemePanel>
            </div>

            <div className="border-l-2 border-zinc-700 pl-4 font-mono text-xs leading-relaxed text-zinc-400">
              The panel is absolutely positioned and slides over the page rather
              than pushing it, so opening a section costs no reflow of the
              article underneath — the reason to prefer a rail that overlays
              over one that displaces.
            </div>
          </section>

          {/* ── The treatments ─────────────────────────────────────────── */}
          <Variation
            id="flush"
            name="02 — FLUSH"
            tagline="The plain notebook read, and the baseline: tabs sized to their own labels, stacked from the top, tight to the edge. The open tab fills with its accent and covers the rail's rule, so tab and page read as one piece."
            render={() => <FlushTabs dividers={SITE_DIVIDERS} />}
            notes={
              <>
                Nothing is centred or distributed — the tabs stack from the top
                and stop, so the rail is as ragged as a real set of index tabs
                and a sixth section just makes the column longer. That is also
                the weakness: a long enough nav runs off the bottom, which is
                why the column scrolls rather than squashing.
              </>
            }
          />

          <Variation
            id="split"
            name="03 — SPLIT"
            tagline="The same rail divided evenly: every tab takes an equal share of the full height, so the column always reaches the bottom however many sections there are."
            render={() => <SplitTabs dividers={SITE_DIVIDERS} />}
            notes={
              <>
                The open tab does not fill — it takes the sheet&rsquo;s own
                surface and drops its right rule, so the two read as one piece
                of paper folded round the edge. The accent survives as a bar
                hard against the very edge of the screen, which is the only part
                of a notebook tab you can see when the book is shut. The most
                app-shell of the six, and the one that scales to a nav that
                keeps growing.
              </>
            }
          />

          <Variation
            id="protrude"
            name="04 — PROTRUDE"
            tagline="The physical read. The page keeps its own complete rectangle and the tabs are glued to its left edge, tucked back off the frame until they are chosen — a shut tab sits mostly off-screen, the open one is pulled proud."
            render={() => <ProtrudeTabs dividers={SITE_DIVIDERS} />}
            notes={
              <>
                The only treatment where a tab is deliberately part-way{' '}
                <span className="text-white">off</span> the screen, and the
                reason to want it: at rest the rail costs about a centimetre of
                colour, and choosing a section is a pull rather than a
                highlight. The one to check hardest on a touch device — a tab
                that is half off the edge is also half a target.
              </>
            }
          />

          <Variation
            id="sliver"
            name="05 — SLIVER"
            tagline="The cheapest rail here. At rest it is nothing but a column of coloured page edges hard against the left of the screen — no labels, about nine pixels of navigation. Point at it, or tab into it, and it widens."
            render={() => <SliverTabs dividers={SITE_DIVIDERS} />}
            notes={
              <>
                The rail is absolutely positioned, so widening slides it over
                the page instead of reflowing it. Colour is doing all the work
                at rest, which is exactly the objection to it: a reader who
                cannot tell the accents apart has an unlabelled rail, so this
                one needs the labels to appear on focus as well as hover — they
                do — and probably a persistent label for the current section
                before it could ship.
              </>
            }
          />

          <Variation
            id="nested"
            name="06 — NESTED"
            tagline="Two levels of tab, both vertical, both on the left: sections on the outer rail, the open section's destinations on a second narrower rail inside it, the page to the right of both."
            render={() => <NestedTabs dividers={SITE_DIVIDERS} />}
            notes={
              <>
                The treatment that replaces a header{' '}
                <span className="text-white">and</span> its dropdowns. A bar has
                to hide the second level behind a hover menu because it has no
                room; a rail has the whole height of the screen, so the second
                level is simply always there. Costs ~5rem of width for it, which
                is the honest price.
              </>
            }
          />

          {/* ── Where each one earns its place ────────────────────────── */}
          <section className="space-y-4">
            <h2 className="font-display text-2xl font-bold uppercase text-white">
              [ WHICH ONE ]
            </h2>
            <div className="overflow-x-auto border-2 border-white bg-zinc-900">
              <table className="w-full min-w-[42rem] font-mono text-xs">
                <thead>
                  <tr className="border-b-2 border-white text-left">
                    <th className="p-3 font-bold uppercase text-brutalist-cyan">
                      Treatment
                    </th>
                    <th className="p-3 font-bold uppercase text-brutalist-cyan">
                      Costs at rest
                    </th>
                    <th className="p-3 font-bold uppercase text-brutalist-cyan">
                      Best for
                    </th>
                  </tr>
                </thead>
                <tbody className="text-zinc-400">
                  {[
                    [
                      'Shell',
                      '3rem, permanently',
                      'The site chrome — this is the one to build',
                    ],
                    [
                      'Flush',
                      '2.75rem, top-aligned',
                      'A short, stable nav that will not grow',
                    ],
                    [
                      'Split',
                      '2.75rem, full height',
                      'A nav that keeps growing; app-shell pages',
                    ],
                    [
                      'Protrude',
                      '~1.5rem of colour',
                      'Reading pages, where the nav should recede',
                    ],
                    ['Sliver', '0.55rem', 'Talk decks and full-bleed pages'],
                    [
                      'Nested',
                      '5rem, full height',
                      'Section landing pages with real sub-navigation',
                    ],
                  ].map(([name, cost, best]) => (
                    <tr
                      key={name}
                      className="border-b border-zinc-700 last:border-b-0"
                    >
                      <td className="p-3 font-bold text-white">{name}</td>
                      <td className="p-3">{cost}</td>
                      <td className="p-3">{best}</td>
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
                <span className="text-brutalist-cyan">&gt;</span> Small
                viewports. A vertical rail needs height, and a phone in
                landscape has none. Below the{' '}
                <span className="text-white">sm</span> breakpoint the rail most
                likely collapses to the existing burger — the rail is the
                desktop shape, not the only shape.
              </li>
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Rotated text
                and screen readers. `writing-mode` does not change reading
                order, so the label is read normally — but it does mean the
                accessible name is the only thing carrying the section, and the
                labels have to stay real text, never an image or a glyph.
              </li>
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Keyboard
                traversal. Tabs are buttons and announce{' '}
                <span className="text-white">aria-expanded</span>, but a
                navigation rail wants up/down arrow keys and a documented focus
                order before it is the only way around the site.
              </li>
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Reduced
                motion. Shell, Sliver and Protrude all animate transform or
                width; each needs a{' '}
                <span className="text-white">prefers-reduced-motion</span> path
                that lands on the same end state without the travel.
              </li>
              <li>
                <span className="text-brutalist-cyan">&gt;</span> Semantic
                roles. This prototype speaks the blog&rsquo;s current vocabulary
                (<span className="text-white">brutalist-*</span>,{' '}
                <span className="text-white">zinc-*</span>); the package now
                addresses <span className="text-white">--ds-surface-*</span>,{' '}
                <span className="text-white">--ds-text-*</span> and{' '}
                <span className="text-white">--ds-accent-*</span> across a
                four-rung ladder, so promoting it means a pass over every class
                here.
              </li>
            </ul>
            <p className="pt-1 font-mono text-xs leading-relaxed text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> The shapes this
              was chosen out of — stacks, fans, folds, a segmented top ribbon —
              are kept at{' '}
              <Link
                href="/design-sandbox/blades"
                className="font-bold text-brutalist-cyan underline hover:text-brutalist-pink"
              >
                design-sandbox/blades
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
