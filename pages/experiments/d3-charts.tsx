import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  type BarDatum,
  type CurveName,
  ForceGraph,
  type GraphLink,
  type GraphNode,
  layoutForce,
  SeriesChart,
} from '@/components/charts';
import Link from '@/components/Link';
import PageHeader from '@/components/PageHeader';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

/**
 * d3 experiment: the chart primitive from docs/d3-research.md, charting that
 * document's own measurements.
 *
 * The research verdict was "d3 computes, React renders" — named `d3-*`
 * submodules for layout only, no `d3-selection`, no `d3-transition`, no
 * `d3-axis`, never the `d3` meta-package. This page is that verdict built:
 * every mark below is JSX over numbers from `components/charts/chartModel.ts`.
 *
 * It is also the answer to the research doc's own complaint — that the site had
 * no data worth charting. It did; the data was in `docs/`.
 */

/**
 * Isolated-library cost per usage shape. esbuild --bundle --minify, react and
 * react-dom external, gzip -9. Method and full table:
 * docs/d3-research.md#measured-cost.
 */
const SUBMODULE_COST: BarDatum[] = [
  { label: 'd3-quadtree', value: 1.9 },
  { label: 'd3-contour', value: 2.0 },
  { label: 'd3-sankey (+ d3-shape)', value: 2.8 },
  { label: 'd3-hierarchy', value: 4.1 },
  { label: 'd3-force', value: 4.9, accent: 'pink', note: '· drawn below' },
  { label: 'd3-delaunay', value: 7.1 },
  { label: 'd3-geo', value: 7.9 },
  { label: 'd3-cloud + d3-scale', value: 11.0 },
  { label: 'd3-scale', value: 13.0 },
  {
    label: 'this chart primitive',
    value: 15.2,
    accent: 'yellow',
    note: '· scale + shape + array + format',
  },
  { label: 'd3 meta-package, shaken', value: 18.1 },
];

/** The tree-shaking cliff: same package, same bundler, two call-site habits. */
const SHAKE_CLIFF: BarDatum[] = [
  {
    label: 'named or namespace import',
    value: 18.1,
    accent: 'cyan',
    note: '· members accessed statically',
  },
  {
    label: 'namespace escapes',
    value: 94.1,
    accent: 'pink',
    note: '· d3[name](…), or re-exported',
  },
];

/** What a chart weighs against the libraries the interactives already pull. */
const IN_CONTEXT: BarDatum[] = [
  { label: 'this chart primitive', value: 15.2, accent: 'yellow' },
  { label: 'motion/react', value: 41.8 },
  { label: '@xyflow/react', value: 58.1 },
];

/**
 * The other research doc's numbers, charted by this primitive — the case the
 * d3 doc argued would justify building it. From docs/hero-webgl-research.md.
 */
const WEBGL_COST: BarDatum[] = [
  {
    label: 'raw WebGL2, no library',
    value: 0.8,
    accent: 'yellow',
    note: '· what shipped',
  },
  { label: 'ogl', value: 13.0 },
  { label: 'three', value: 129.6 },
  { label: '@react-three/fiber + three', value: 237.9, accent: 'pink' },
];

/** The five curves the brutalist constraint leaves of d3-shape's twenty. */
const PERMITTED_CURVES: { name: CurveName; blurb: string }[] = [
  { name: 'linear', blurb: 'straight between vertices' },
  { name: 'step', blurb: 'holds, then jumps mid-interval' },
  { name: 'stepBefore', blurb: 'jumps first, then holds' },
  { name: 'stepAfter', blurb: 'holds first, then jumps' },
  { name: 'linearClosed', blurb: 'linear, path closed' },
];

const CURVE_DATA: [number, number][] = [
  [0, 3],
  [1, 7],
  [2, 4],
  [3, 8],
  [4, 5],
  [5, 9],
];

/** The diamond dependency conflict from DepResolve — five nodes, hand-placed
 * there, force-placed here. Small enough that force layout is a demonstration
 * rather than a recommendation. */
const GRAPH_NODES: GraphNode[] = [
  { id: 'app', accent: 'yellow' },
  { id: 'A', accent: 'cyan' },
  { id: 'B', accent: 'cyan' },
  { id: 'Lib v1', accent: 'pink' },
  { id: 'Lib v2', accent: 'pink' },
];

const GRAPH_LINKS: GraphLink[] = [
  { source: 'app', target: 'A' },
  { source: 'app', target: 'B' },
  { source: 'A', target: 'Lib v1' },
  { source: 'B', target: 'Lib v2' },
];

function Panel({
  title,
  accent = 'white',
  children,
}: {
  title: string;
  accent?: 'white' | 'cyan' | 'pink' | 'yellow';
  children: React.ReactNode;
}) {
  const border = {
    white: 'border-white',
    cyan: 'border-brutalist-cyan',
    pink: 'border-brutalist-pink',
    yellow: 'border-brutalist-yellow',
  }[accent];
  const heading = {
    white: 'text-white',
    cyan: 'text-brutalist-cyan',
    pink: 'text-brutalist-pink',
    yellow: 'text-brutalist-yellow',
  }[accent];

  return (
    <section className={`mt-6 border-2 ${border} bg-zinc-900 p-6`}>
      <h3
        className={`mb-4 font-display text-xl font-bold uppercase ${heading}`}
      >
        [ {title} ]
      </h3>
      {children}
    </section>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 font-mono text-sm leading-relaxed text-zinc-400">
      {children}
    </p>
  );
}

export default function D3Charts() {
  // Two independent layouts of identical input. d3-force@3 seeds its own LCG
  // instead of calling Math.random, so these must agree — and because the
  // computation is pure and synchronous, the server render agrees too.
  const runA = layoutForce(GRAPH_NODES, GRAPH_LINKS, {
    width: 300,
    height: 220,
  });
  const runB = layoutForce(GRAPH_NODES, GRAPH_LINKS, {
    width: 300,
    height: 220,
  });
  const identical = runA.digest === runB.digest;

  return (
    <>
      <PageSEO
        title={`d3 Charts - ${siteMetadata.author}`}
        description="A brutalist chart primitive on named d3 submodules, charting this repo's own bundle measurements"
      />
      <div className="divide-y divide-white border-2 border-white bg-black">
        <PageHeader
          title="D3_CHARTS"
          icon={BarChart3}
          accent="yellow"
          subtitle="d3 computes, React renders — the chart primitive, charting its own research"
        />

        <div className="container py-12">
          <Panel title="WHAT_A_SUBMODULE_COSTS" accent="yellow">
            <BarChart
              data={SUBMODULE_COST}
              label="Gzipped cost of each d3 usage shape, in kilobytes"
              unit="KB"
              labelWidth={220}
              valueWidth={290}
            />
            <Note>
              {'>'} Every bar is a{' '}
              <span className="text-white">{'<rect>'}</span> React drew from a{' '}
              <span className="text-white">scaleLinear</span> output. The
              gridlines are <span className="text-white">scale.ticks(5)</span>{' '}
              rendered as JSX in <span className="text-white">font-mono</span> —{' '}
              <span className="text-white">d3-axis</span> would have cost 3.0 KB
              to hardcode{' '}
              <span className="text-white">font-family: sans-serif</span>{' '}
              instead.
            </Note>
          </Panel>

          <Panel title="THE_TREE_SHAKING_CLIFF" accent="pink">
            <BarChart
              data={SHAKE_CLIFF}
              label="Cost of the d3 meta-package when tree-shaking succeeds versus fails"
              unit="KB"
              labelWidth={210}
              valueWidth={310}
              rowHeight={44}
            />
            <Note>
              {'>'} Same package, same bundler.{' '}
              <span className="text-white">import * as d3</span> and{' '}
              <span className="text-white">
                {"import { scaleLinear } from 'd3'"}
              </span>{' '}
              measure identically — esbuild sees through static member access.
              The 5× is what happens when the namespace object itself escapes,
              which is why the rule is the submodule, not the meta-package.
            </Note>
          </Panel>

          <Panel title="IN_CONTEXT" accent="cyan">
            <BarChart
              data={IN_CONTEXT}
              label="The chart primitive against libraries this site already loads"
              unit="KB"
              labelWidth={210}
              valueWidth={120}
              rowHeight={44}
            />
            <Note>
              {'>'} Both comparators already ship lazily on any page carrying an
              interactive, so a chart is a third of the cheaper one. Left off
              the scale: <span className="text-white">mermaid</span> at 932.7 KB
              gzip, which bundles all of d3 anyway — 16× the largest bar here,
              and the reason the axis would be unreadable with it included.
            </Note>
          </Panel>

          <Panel title="CHARTING_THE_OTHER_RESEARCH">
            <BarChart
              data={WEBGL_COST}
              label="Hero renderer options by gzipped cost, in kilobytes"
              unit="KB"
              labelWidth={250}
              valueWidth={160}
            />
            <Note>
              {'>'} These are{' '}
              <Link
                href="https://github.com/rtkelly13/blog/blob/main/docs/hero-webgl-research.md"
                className="text-brutalist-cyan"
              >
                docs/hero-webgl-research.md
              </Link>
              's numbers. The d3 research concluded the site had no data worth
              charting; it was wrong about where to look — the data was in{' '}
              <span className="text-white">docs/</span>, not{' '}
              <span className="text-white">data/</span>. This panel is the
              primitive earning its bytes on the first dataset that existed.
            </Note>
          </Panel>

          <Panel title="THE_FIVE_PERMITTED_CURVES">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PERMITTED_CURVES.map((curve) => (
                <figure key={curve.name} className="m-0">
                  <SeriesChart
                    data={CURVE_DATA}
                    curve={curve.name}
                    label={`The same six points drawn with curve${
                      curve.name.charAt(0).toUpperCase() + curve.name.slice(1)
                    }`}
                    accent="cyan"
                  />
                  <figcaption className="mt-2 font-mono text-xs text-zinc-400">
                    <span className="text-white">{curve.name}</span> —{' '}
                    {curve.blurb}
                  </figcaption>
                </figure>
              ))}
            </div>
            <Note>
              {'>'} <span className="text-white">d3-shape</span> exports twenty
              curves; hard edges leave these five.{' '}
              <span className="text-white">SeriesChart</span> takes a{' '}
              <span className="text-white">CurveName</span>, not a curve
              factory, so <span className="text-white">curveCatmullRom</span>{' '}
              cannot reach it from a call site — the constraint lives in the
              type, not in a review comment.
            </Note>
          </Panel>

          <Panel
            title="D3_FORCE_IS_DETERMINISTIC"
            accent={identical ? 'cyan' : 'pink'}
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {[
                { run: 'A', model: runA },
                { run: 'B', model: runB },
              ].map(({ run }) => (
                <figure key={run} className="m-0">
                  <p className="mb-2 font-mono text-xs uppercase text-zinc-400">
                    {'>'} run {run} — 300 ticks
                  </p>
                  <div className="border-2 border-white bg-black p-2">
                    <ForceGraph
                      nodes={GRAPH_NODES}
                      links={GRAPH_LINKS}
                      label={`Force-directed layout of the diamond dependency graph, run ${run}`}
                      width={300}
                      height={220}
                    />
                  </div>
                </figure>
              ))}
            </div>

            <p
              className={`mt-4 border-2 p-3 font-mono text-sm ${
                identical
                  ? 'border-brutalist-cyan text-brutalist-cyan'
                  : 'border-brutalist-pink text-brutalist-pink'
              }`}
            >
              {'>'} digests {identical ? 'match' : 'DIFFER'}:{' '}
              {identical ? 'identical layouts' : 'non-deterministic — bug'}
            </p>
            <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-zinc-500">
              {runA.digest}
            </p>

            <Note>
              {'>'} Force layout is usually ruled out of a snapshot-tested
              codebase as non-deterministic. It isn't:{' '}
              <span className="text-white">d3-force@3</span> seeds its own LCG
              and places nodes on a phyllotaxis spiral, so identical input lands
              in identical pixels. Two things make that hold —{' '}
              <span className="text-white">.stop()</span> before the first tick,
              because <span className="text-white">forceSimulation()</span>{' '}
              starts a timer before it returns, and fresh node objects per call,
              because d3-force writes positions onto the objects it is handed.
              <br />
              {'>'} So there is no simulation running on this page. The
              coordinates are computed during render and drawn once, which is
              also why the two panels agree between the server render and the
              client.
            </Note>
          </Panel>

          <Panel title="WHAT_THIS_PAGE_DOES_NOT_USE">
            <p className="font-mono text-sm leading-relaxed text-zinc-400">
              {'>'} <span className="text-white">d3</span> — the meta-package.
              Named submodules only.
              <br />
              {'>'} <span className="text-white">d3-selection</span> — React
              owns every mark, so nothing else touches the subtree.
              <br />
              {'>'} <span className="text-white">d3-transition</span> /
              <span className="text-white"> d3-ease</span> —{' '}
              <span className="text-white">motion</span> is the animation
              library and these charts are static anyway, so there is no clock
              to pause under reduced motion.
              <br />
              {'>'} <span className="text-white">d3-axis</span> —{' '}
              <span className="text-white">scale.ticks()</span> plus JSX, on the
              brutalist tokens.
              <br />
              {'>'} Cycle the theme (HIGH → DIM → SKETCH): every colour above is
              a <span className="text-white">--brutalist-*</span> or{' '}
              <span className="text-white">--color-*</span> token, so the charts
              move onto paper with the rest of the page.
              <br />
              {'>'} Verdict, method and the rules:{' '}
              <Link
                href="https://github.com/rtkelly13/blog/blob/main/docs/d3-research.md"
                className="text-brutalist-cyan"
              >
                docs/d3-research.md
              </Link>
              .
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
