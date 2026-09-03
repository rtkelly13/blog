import { Layers } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  FanBlades,
  FoldBlades,
  LedgerBlades,
  RailBlades,
  RibbonBlades,
  SITE_DIVIDERS,
  StackBlades,
  TabBlades,
} from '@/components/dividers';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * Blades — the geometries the notebook rail was chosen out of.
 *
 * The proposal itself lives at `/design-sandbox/notebook-tabs`. This page is
 * the working-out: seven other shapes the same `Divider` model can take, each
 * rendered in **both** first-class themes at once so the dual-mode claim is
 * verifiable rather than asserted.
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
      <div className={`p-4 ${frame}`}>{children}</div>
    </div>
  );
}

/**
 * One geometry, shown twice. `render` is a function rather than a node so each
 * theme gets its own component instance — you can leave the two panels open on
 * different blades and compare states, not just palettes.
 */
function Variation({
  id,
  name,
  tagline,
  frame = 'h-[20rem]',
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

export default function BladesSandbox() {
  return (
    <>
      <PageSEO
        title={`Blades — other geometries - ${siteMetadata.author}`}
        description="The geometry exploration the left-edge notebook rail was chosen out of"
      />

      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="BLADES"
          icon={Layers}
          subtitle="Other geometries tried — the shapes the notebook rail was chosen out of"
        />

        <div className="space-y-14 px-6 py-10">
          {/* ── Where this page sits ─────────────────────────────────── */}
          <section className="space-y-4">
            <div className="border-2 border-brutalist-yellow bg-zinc-900 p-5">
              <h2 className="mb-3 font-display text-lg font-bold uppercase text-brutalist-yellow">
                [ THIS IS NOT THE PROPOSAL ]
              </h2>
              <p className="max-w-3xl font-mono text-sm leading-relaxed text-white">
                The navigation foundation is the{' '}
                <Link
                  href="/design-sandbox/notebook-tabs"
                  className="font-bold text-brutalist-cyan underline hover:text-brutalist-pink"
                >
                  notebook rail
                </Link>{' '}
                — vertical tabs tight to the left edge. This page is the
                working-out that landed on it: seven other shapes the same model
                can take, kept because a rejected option is only convincing when
                you can still see it.
              </p>
            </div>

            <p className="max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> All of them
              render the same{' '}
              <span className="text-brutalist-yellow">Divider</span> array — id,
              label, hint, accent, links — and differ only in how the set fans
              out. None of them branches on the theme: each is built on the
              remapped tokens only, so the identical markup reads as an edge-lit
              slab on midnight and as a card divider on paper.
            </p>
          </section>

          {/* ── The header replacement, at full width ─────────────────── */}
          <section id="ribbon" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase text-white">
                [ 01 — RIBBON ]
              </h2>
              <p className="mt-1 max-w-3xl font-mono text-sm leading-relaxed text-zinc-400">
                <span className="text-brutalist-cyan">&gt;</span> The direct
                swap for the header bar, shown at the width it would actually
                occupy. At rest it is a segmented rule; the open segment widens
                and drops a blade over the page. Click the open segment to shut
                it again.
              </p>
            </div>

            <div className="space-y-4">
              <ThemePanel
                theme="dark"
                label="midnight — neon terminal"
                frame="min-h-[13rem]"
              >
                <RibbonBlades dividers={SITE_DIVIDERS} initialIndex={0} />
              </ThemePanel>
              <ThemePanel
                theme="sketch"
                label="sketch — paper & ink"
                frame="min-h-[13rem]"
              >
                <RibbonBlades dividers={SITE_DIVIDERS} initialIndex={2} />
              </ThemePanel>
            </div>

            <div className="border-l-2 border-zinc-700 pl-4 font-mono text-xs leading-relaxed text-zinc-400">
              The drop animates{' '}
              <span className="text-white">
                grid-template-rows: 0fr &rarr; 1fr
              </span>{' '}
              rather than a max-height, so a blade with more links than its
              siblings is never clipped and never needs a magic number.
            </div>
          </section>

          {/* ── The rest of the geometries ────────────────────────────── */}
          <Variation
            id="rail"
            name="02 — RAIL"
            tagline="The literal blades read: full-height columns collapsed to their spines, one open at a time. Hover or focus a spine to open it."
            render={() => <RailBlades dividers={SITE_DIVIDERS} />}
            notes={
              <>
                The whole navigation stays on screen, and opening a section
                costs no overlay and no layout shift below. Widths animate on{' '}
                <span className="text-white">flex-grow</span>, which is
                animatable where <span className="text-white">width: auto</span>{' '}
                is not.
              </>
            }
          />

          <Variation
            id="fold"
            name="03 — FOLD"
            tagline="A concertina. Shut blades hinge away from the reader on their left edge; the open one swings flat."
            render={() => <FoldBlades dividers={SITE_DIVIDERS} />}
            notes={
              <>
                The fold angle is <span className="text-white">60°</span> on
                purpose: cos(60°) is exactly 0.5, so a folded blade projects to
                half its width and the negative margin that closes the gap is a
                clean half of the basis instead of a number tuned by eye. The
                only variation that spends real depth — and so the only one
                whose &ldquo;stack you are looking into&rdquo; survives without
                motion.
              </>
            }
          />

          <Variation
            id="tab"
            name="04 — TAB"
            tagline="Dividers seen from above: a stepped strip of tabs on one sheet, the open tab lifted and merged into the sheet below."
            frame="h-[18rem]"
            render={() => <TabBlades dividers={SITE_DIVIDERS} />}
            notes={
              <>
                The conservative option, and the one that survives a narrow
                viewport — the strip scrolls sideways rather than reflowing.
                Also the least interesting: it is a tab bar, and it reads as one
                in both languages.
              </>
            }
          />

          <Variation
            id="stack"
            name="05 — STACK"
            tagline="A sheaf laid one over the next, each shifted far enough right that its edge ribbon stays readable. Pick a ribbon to pull that sheet forward."
            render={() => <StackBlades dividers={SITE_DIVIDERS} />}
            notes={
              <>
                Order is a cycle, not a swap: the sheet you displace goes to the
                back, so the motion always reads the same direction. The
                strongest paper metaphor of the seven, and the one that most
                needs the sketch theme to make its case.
              </>
            }
          />

          <Variation
            id="ledger"
            name="06 — LEDGER"
            tagline="The address-book read: one card face, its siblings' tabs staggered down the right gutter, the rest of the box showing as offset edges behind."
            render={() => <LedgerBlades dividers={SITE_DIVIDERS} />}
            notes={
              <>
                Where <span className="text-white">Rail</span> keeps every
                section on screen, Ledger keeps one in focus and the rest merely
                within reach — the better fit for a reading page, where the
                content is the point and the navigation is not.
              </>
            }
          />

          <Variation
            id="fan"
            name="07 — FAN"
            tagline="The deck. An almost-shut stack that splays about a pivot below the frame when the set is touched; picking a card lifts it out of the arc."
            frame="h-[26rem]"
            render={() => <FanBlades dividers={SITE_DIVIDERS} />}
            notes={
              <>
                The pivot sits deliberately{' '}
                <span className="text-white">below</span> the visible area, so
                the arc stays shallow and every spine label stays upright enough
                to read. The most expressive and the least practical — a
                homepage or a 404, not a nav that has to work every day.
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
                      Variation
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
                      'Ribbon',
                      'One bar — the header footprint',
                      'A drop-in header replacement',
                    ],
                    [
                      'Rail',
                      'A column of spines down one side',
                      'Section landing pages, the app shell',
                    ],
                    [
                      'Fold',
                      'A column of spines, with depth',
                      'The homepage — it wants to be looked at',
                    ],
                    [
                      'Tab',
                      'One strip',
                      'Anywhere narrow; settings and sub-sections',
                    ],
                    [
                      'Stack',
                      'A stack plus its ribbons',
                      'Archive and series indexes',
                    ],
                    [
                      'Ledger',
                      'One gutter',
                      'Reading pages — nav within reach, not on top',
                    ],
                    [
                      'Fan',
                      'The whole frame',
                      'Homepage hero, 404, a talk deck',
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

          <section className="space-y-3 border-2 border-white bg-zinc-900 p-5">
            <h2 className="font-display text-lg font-bold uppercase text-white">
              [ WHY THE RAIL WON ]
            </h2>
            <p className="max-w-3xl font-mono text-xs leading-relaxed text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> Every geometry
              above spends either a band of height (Ribbon, Tab) or the middle
              of the frame (Fan, Stack, Ledger). A vertical rail on the left
              spends a column the reading measure was never using, and gives
              back the whole horizontal band a sticky header takes out of every
              screenful — which is the one resource a blog page is actually
              short of.
            </p>
            <p className="max-w-3xl font-mono text-xs leading-relaxed text-zinc-400">
              <span className="text-brutalist-cyan">&gt;</span> Rail and Fold
              came closest, and the{' '}
              <Link
                href="/design-sandbox/notebook-tabs"
                className="font-bold text-brutalist-cyan underline hover:text-brutalist-pink"
              >
                notebook rail
              </Link>{' '}
              is what they turn into once the panel stops competing with the
              page for width and becomes a tab instead.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
