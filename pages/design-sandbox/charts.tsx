import { ChevronLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from '@/components/Link';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

const MigrationRatioChart = dynamic(
  () => import('@/components/interactive/MigrationRatioChart'),
  { ssr: false },
);

const SeriesPaletteChart = dynamic(
  () => import('@/components/charts/SeriesPaletteChart'),
  { ssr: false },
);

/** 11 series against an 8-slot palette — the case that forces a fold. */
const MANY_SERIES = (() => {
  const names = [
    'ALPHA',
    'BRAVO',
    'CHARLIE',
    'DELTA',
    'ECHO',
    'FOXTROT',
    'GOLF',
    'HOTEL',
    'INDIA',
    'JULIET',
    'KILO',
  ];
  const groups = ['Q1', 'Q2', 'Q3', 'Q4'];
  // Fixed weights, no RNG — the sandbox must render identically every visit.
  const weights = [30, 26, 23, 20, 17, 14, 11, 9, 6, 4, 2];
  const drift = [1, 0.85, 1.15, 0.95];
  return groups.flatMap((group, gi) =>
    names.map((series, si) => ({
      group,
      series,
      value: Math.round(weights[si] * drift[gi] + ((si * 7 + gi * 3) % 5)),
    })),
  );
})();

/** Ordered buckets — the case that wants the ramp, not identity colours. */
const TIERS = (() => {
  const tiers = ['0-1y', '1-2y', '2-3y', '3-5y', '5-8y', '8-12y', '12y+'];
  const groups = ['2023', '2024', '2025'];
  const weights = [8, 14, 19, 24, 18, 11, 6];
  return groups.flatMap((group, gi) =>
    tiers.map((series, si) => ({
      group,
      series,
      value: weights[si] + ((si + gi * 2) % 4),
    })),
  );
})();

/**
 * ILLUSTRATIVE per-year shape. Only the final year (36 legacy : 73 modern) is a
 * figure from the migration write-up; the intermediate years are placeholders
 * standing in for the not-yet-re-mined series, so this page can exercise the
 * chart's layout, stagger and theming. Do not quote the middle years anywhere.
 */
const SAMPLE_ROWS = [
  { year: 2019, legacy: 88, modern: 9 },
  { year: 2020, legacy: 84, modern: 18 },
  { year: 2021, legacy: 74, modern: 29 },
  { year: 2022, legacy: 61, modern: 43 },
  { year: 2023, legacy: 52, modern: 57 },
  { year: 2024, legacy: 44, modern: 66 },
  { year: 2025, legacy: 36, modern: 73 },
];

/** A deliberately short series, to check the automatic guide margins hold up. */
const SPARSE_ROWS = [
  { year: 2019, legacy: 88, modern: 9 },
  { year: 2025, legacy: 36, modern: 73 },
];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-14">
      <h2 className="font-display text-2xl font-bold text-white">
        [ {title} ]
      </h2>
      <p className="mt-1 mb-4 font-mono text-xs text-zinc-400">{note}</p>
      {children}
    </section>
  );
}

export default function ChartsSandboxPage() {
  return (
    <>
      <PageSEO
        title={`Charts — Design Sandbox — ${siteMetadata.title}`}
        description="TanStack Charts adoption spike: themed stacked bars across all three modes"
      />

      <div className="mx-auto max-w-4xl px-4 py-10">
        <Link
          href="/design-sandbox"
          className="mb-6 inline-flex items-center gap-1 font-mono text-xs text-zinc-400 hover:text-brutalist-cyan"
        >
          <ChevronLeft className="h-4 w-4" /> BACK_TO_SANDBOX
        </Link>

        <h1 className="font-display text-4xl font-bold text-white">
          [ CHARTS ]
        </h1>
        <p className="mt-2 mb-4 font-mono text-sm text-zinc-400">
          A spike on{' '}
          <code className="text-brutalist-cyan">@tanstack/react-charts</code>.
          Series colours come from{' '}
          <code className="text-brutalist-cyan">--ts-chart-1..6</code>, bridged
          to the brutalist accents in{' '}
          <code className="text-brutalist-cyan">css/tailwind.css</code>; axes,
          grid, legend and tick labels inherit{' '}
          <code className="text-brutalist-cyan">currentColor</code>. No hex is
          hardcoded in the component.
        </p>
        <div className="mb-10 border-2 border-brutalist-yellow bg-zinc-900 p-3 font-mono text-xs text-zinc-300">
          <strong className="text-brutalist-yellow">VERIFY:</strong> cycle the
          theme switch (HIGH → DIM → SKETCH) and confirm the bars, grid and
          legend all re-theme, and that the chart reads on paper as well as on
          black. The library is at version{' '}
          <code className="text-brutalist-cyan">0.0.0</code> — this page is the
          canary for API churn on upgrade.
        </div>

        <Section
          title="STACKED BARS, STAGGERED REVEAL"
          note="Legacy vs modern project counts per year. Bars grow from the baseline on scroll-into-view; reduced motion lands on the finished chart. Middle years are placeholder data."
        >
          <MigrationRatioChart
            rows={SAMPLE_ROWS}
            caption="// Illustrative series — only the 2025 ratio is a real figure"
          />
        </Section>

        <Section
          title="SPARSE SERIES"
          note="Two years only. Checks that the automatic guide-margin solve still reserves the right space for rotated-free tick labels and the axis title."
        >
          <MigrationRatioChart
            rows={SPARSE_ROWS}
            title="MIGRATION_RATIO.SPARSE"
            duration={1}
          />
        </Section>

        <Section
          title="RELABELLED, NO AUTOPLAY"
          note="Every label is a prop, and autoplay is off — the chart renders fully grown until Replay is pressed. Confirms nothing about the reveal is baked into the definition."
        >
          <MigrationRatioChart
            rows={SAMPLE_ROWS}
            title="TFM_SPLIT.CHART"
            legacyLabel="NET_FRAMEWORK"
            modernLabel="NET_MODERN"
            yLabel="[ PROJECT COUNT ]"
            legendLabel="[ TFM ]"
            autoplay={false}
            height={280}
          />
        </Section>

        <Section
          title="EMPTY INPUT"
          note="No rows renders nothing at all — no frame, no placeholder — matching how TalkStatsChart hides below its reveal threshold. Nothing should appear between this note and the next heading."
        >
          <MigrationRatioChart rows={[]} />
        </Section>

        <h2 className="mt-16 mb-2 font-display text-3xl font-bold text-white">
          [ PALETTE ]
        </h2>
        <p className="mb-10 font-mono text-xs text-zinc-400">
          Eight categorical slots in a fixed, derived order, plus a neutral
          &ldquo;Other&rdquo; bucket and a single-hue sequential ramp. Values
          live in <code className="text-brutalist-cyan">css/tailwind.css</code>;{' '}
          <code className="text-brutalist-cyan">pnpm check:palette</code>{' '}
          re-runs the colourblind-safety checks against every theme&rsquo;s real
          surface.
        </p>

        <Section
          title="ALL EIGHT SLOTS"
          note="The full categorical palette. Slot order is the CVD-safety mechanism, not decoration — it was derived by search. Never reorder it; never add a ninth."
        >
          <SeriesPaletteChart
            rows={MANY_SERIES.filter(
              (r) => !['INDIA', 'JULIET', 'KILO'].includes(r.series),
            )}
            title="EIGHT_SERIES.CHART"
          />
        </Section>

        <Section
          title="FOLD TO OTHER — 11 SERIES, 8 SLOTS"
          note="Cardinality past the palette is a data problem, not a colour problem. foldToOther() ranks by total, keeps the top eight, and sums the rest into one neutral bucket — no generated hues, no cycling. The bucket always sits last so it never takes an identity slot."
        >
          <SeriesPaletteChart rows={MANY_SERIES} title="FOLD_TO_OTHER.CHART" />
        </Section>

        <Section
          title="ALL-PAIRS CAP — 4 SERIES"
          note="Scatter, bubble, choropleth and small multiples let any two marks touch, so every pair must separate — a much harder test that caps those forms at four, not eight. Folding to that cap is the same call with keep: SERIES_CAP.allPairs."
        >
          <SeriesPaletteChart
            rows={MANY_SERIES}
            keep={4}
            title="ALL_PAIRS_CAP.CHART"
          />
        </Section>

        <Section
          title="SEQUENTIAL RAMP — ORDERED BUCKETS"
          note="Tenure bands: reordering these would change the meaning, so they are ordinal, not categorical. One hue, light to dark, so the reader sees the order in the colour. Using identity colours here would throw that ordering away."
        >
          <SeriesPaletteChart
            rows={TIERS}
            sequential
            title="TENURE_BANDS.CHART"
            legendLabel="[ TENURE ]"
          />
        </Section>

        <Section
          title="TEXTURE — IDENTITY WITHOUT COLOUR"
          note="Directional hatch as a second channel, with the angle alternating by slot. For print, forced-colors mode, and any pair sitting in the CVD warn band. Patterns stroke var(--ts-chart-N), so they re-theme with everything else."
        >
          <SeriesPaletteChart
            rows={MANY_SERIES.filter(
              (r) => !['INDIA', 'JULIET', 'KILO'].includes(r.series),
            )}
            texture
            title="TEXTURE.CHART"
          />
          <MigrationRatioChart
            rows={SAMPLE_ROWS}
            title="MIGRATION_RATIO.TEXTURED"
            texture
            autoplay={false}
            height={260}
          />
        </Section>
      </div>
    </>
  );
}
