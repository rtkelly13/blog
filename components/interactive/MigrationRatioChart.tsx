import { colorLegend, defineChart, rect } from '@tanstack/charts';
import { Chart } from '@tanstack/react-charts';
import { scaleBand, scaleLinear, scaleOrdinal } from 'd3-scale';
import { RotateCcw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import ChartHatchDefs from '@/components/charts/ChartHatchDefs';
import { hatchFill } from '@/lib/charts/hatch';
import { chartTheme, seriesColors } from '@/lib/charts/palette';
import {
  buildMigrationPlan,
  formatModernShare,
  formatRatio,
  type MigrationRow,
  type StackedSegment,
  stateAt,
} from './migrationRatioModel';

/** A segment plus its display label, which is what the colour channel groups on. */
interface LabelledSegment extends StackedSegment {
  bandLabel: string;
}

interface ChartInput {
  segments: readonly LabelledSegment[];
  years: readonly number[];
  maxTotal: number;
  bandLabels: readonly [string, string];
  /** Paint per band, already resolved to a solid slot or a hatch pattern. */
  bandPaints: readonly [string, string];
  yLabel: string;
  legendLabel: string;
}

/**
 * Defined once at module scope, not per render. TanStack Charts wants a stable
 * definition; the per-frame data arrives through `input`, so the growing bars
 * reuse one definition and reconcile against the segments' stable `key`.
 *
 * Paint arrives through `input.bandPaints` rather than being read off
 * `theme.palette` here, because the texture variant swaps solid slots for hatch
 * patterns whose ids depend on the mounted instance.
 */
const migrationChart = defineChart<ChartInput>()(({ input }) => ({
  marks: [
    rect(input.segments, {
      x: 'year',
      y1: 'y1',
      y2: 'y2',
      z: 'bandLabel',
      key: 'key',
      // Bars carry the brutalist 2px border. `barY` has no stroke option at all,
      // so stacked bars go through `rect` — which also lets the model own the
      // stack endpoints directly.
      stroke: 'currentColor',
      strokeWidth: 2,
      inset: 0,
    }),
  ],
  // The band domain must be numbers to match the numeric `year` field; a string
  // domain silently maps every bar to NaN.
  x: { scale: scaleBand<number>().domain(input.years).padding(0.24) },
  y: {
    scale: scaleLinear().domain([0, input.maxTotal]).nice(),
    label: input.yLabel,
    grid: true,
  },
  color: {
    scale: scaleOrdinal(input.bandLabels, input.bandPaints),
    legend: colorLegend({ label: input.legendLabel }),
  },
  // Widens the palette from the library's built-in six slots to the blog's eight.
  theme: chartTheme,
}));

function ControlButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="border-2 border-white bg-black px-2 py-1 font-mono text-xs text-white transition-colors hover:bg-zinc-900"
    >
      {children}
    </button>
  );
}

export interface MigrationRatioChartProps {
  /** Per-year legacy/modern project counts. Rows may arrive in any order. */
  rows: readonly MigrationRow[];
  title?: string;
  caption?: string;
  legacyLabel?: string;
  modernLabel?: string;
  yLabel?: string;
  legendLabel?: string;
  /** Reveal duration in seconds. */
  duration?: number;
  height?: number;
  autoplay?: boolean;
  /**
   * Swap solid fills for directional hatch patterns. A second, non-colour
   * channel for identity — for print, forced-colors mode, or wherever a series
   * pair sits in the CVD warn band.
   */
  texture?: boolean;
}

/**
 * Stacked bar chart of legacy vs modern project counts per year, built on
 * TanStack Charts. Bars grow from the baseline on scroll-into-view, staggered by
 * year, and the headline tiles quote the final legacy:modern ratio.
 *
 * Layout, stacking and the reveal all live in `migrationRatioModel.ts` — the
 * same seeded-model-plus-`stateAt(t)` split as `MapReduceViz`. Reduced motion
 * skips straight to the finished chart: this is a single reveal rather than a
 * multi-phase simulation, so there is nothing to step through.
 *
 * Colours come from `--ts-chart-1`/`--ts-chart-2`, remapped per theme in
 * `css/tailwind.css`; axes, grid and legend inherit `currentColor`. Nothing here
 * hardcodes a hex, so all three themes follow automatically.
 */
export default function MigrationRatioChart({
  rows,
  title = 'MIGRATION_RATIO.CHART',
  caption,
  legacyLabel = 'LEGACY',
  modernLabel = 'MODERN',
  yLabel = '[ PROJECTS ]',
  legendLabel = '[ TARGET FRAMEWORK ]',
  duration = 1.6,
  height = 340,
  autoplay = true,
  texture = false,
}: MigrationRatioChartProps) {
  const reduceMotion = useReducedMotion() ?? false;
  // Pattern ids are document-global; scope them so two charts can coexist.
  const hatchPrefix = useId().replace(/[^\w-]/g, '');
  const containerRef = useRef<HTMLElement>(null);
  // Without autoplay the chart must already be readable — progress 0 would show
  // an empty plot area. Replay still animates it from the baseline.
  const [progress, setProgress] = useState(autoplay ? 0 : 1);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const plan = useMemo(() => buildMigrationPlan(rows), [rows]);
  const frame = useMemo(() => stateAt(plan, progress), [plan, progress]);

  const replay = useCallback(() => {
    setProgress(0);
    setPlaying(true);
    setStarted(true);
  }, []);

  // Autoplay once scrolled into view (mirrors MapReduceViz).
  useEffect(() => {
    if (!autoplay || started || reduceMotion) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      setPlaying(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoplay, started, reduceMotion]);

  // Reduced motion: land on the finished chart, no clock.
  useEffect(() => {
    if (reduceMotion) {
      setStarted(true);
      setPlaying(false);
      setProgress(1);
    }
  }, [reduceMotion]);

  // The clock: requestAnimationFrame while playing.
  useEffect(() => {
    if (!playing || reduceMotion) return;
    const span = duration > 0 ? duration : 1;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) {
        const dt = (now - last) / 1000;
        setProgress((prev) => {
          const next = prev + dt / span;
          if (next >= 1) {
            setPlaying(false);
            return 1;
          }
          return next;
        });
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, reduceMotion]);

  const bandLabels = useMemo(
    () => [legacyLabel, modernLabel] as [string, string],
    [legacyLabel, modernLabel],
  );

  /**
   * Legacy takes slot 2 and modern slot 1, so the eye tracks the block that
   * grows. The legend still reads bottom-up with the stack.
   */
  const bandPaints = useMemo<[string, string]>(() => {
    if (texture) return [hatchFill(hatchPrefix, 1), hatchFill(hatchPrefix, 0)];
    const [first, second] = seriesColors(2);
    return [second, first];
  }, [texture, hatchPrefix]);

  const input = useMemo<ChartInput>(
    () => ({
      segments: frame.map((segment) => ({
        ...segment,
        bandLabel: segment.band === 'legacy' ? legacyLabel : modernLabel,
      })),
      years: plan.years,
      maxTotal: plan.maxTotal,
      bandLabels,
      bandPaints,
      yLabel,
      legendLabel,
    }),
    [
      frame,
      plan.years,
      plan.maxTotal,
      bandLabels,
      bandPaints,
      legacyLabel,
      modernLabel,
      yLabel,
      legendLabel,
    ],
  );

  const { finalRatio } = plan;
  const lastYear = plan.years[plan.years.length - 1];

  if (plan.rows.length === 0) return null;

  const summary = `Stacked bar chart of project counts per year, split between ${legacyLabel.toLowerCase()} and ${modernLabel.toLowerCase()} target frameworks, across ${plan.years.length} years from ${plan.years[0]} to ${lastYear}. By ${lastYear} the split is ${finalRatio.legacy} ${legacyLabel.toLowerCase()} to ${finalRatio.modern} ${modernLabel.toLowerCase()}, or ${formatModernShare(finalRatio)} modern.`;

  return (
    <figure className="my-6">
      <section
        ref={containerRef}
        aria-label={summary}
        className="border-2 border-white bg-black shadow-hard-lg"
      >
        {/* Title bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-white bg-zinc-900 px-3 py-2">
          <span className="font-mono text-xs font-bold text-white">
            {title}
          </span>
          {!reduceMotion && (
            <ControlButton label="Replay chart reveal" onClick={replay}>
              <RotateCcw size={12} />
            </ControlButton>
          )}
        </div>

        {/* Headline tiles — the figure the write-up quotes. */}
        <div className="flex flex-wrap gap-x-10 gap-y-2 border-b-2 border-white px-3 py-4 font-mono">
          <div>
            <div className="font-display text-4xl font-bold text-brutalist-cyan">
              {formatRatio(finalRatio)}
            </div>
            <div className="text-xs uppercase text-zinc-400">
              {legacyLabel}:{modernLabel} in {lastYear}
            </div>
          </div>
          <div>
            <div className="font-display text-4xl font-bold text-brutalist-yellow">
              {formatModernShare(finalRatio)}
            </div>
            <div className="text-xs uppercase text-zinc-400">
              on {modernLabel.toLowerCase()}
            </div>
          </div>
        </div>

        {/* The chart. `font-mono` on the host makes the axes, legend and their
            measured guide margins use IBM Plex Mono like the rest of the frame. */}
        <div className="px-3 py-4 font-mono text-white">
          {texture && <ChartHatchDefs prefix={hatchPrefix} />}
          <Chart
            definition={migrationChart}
            input={input}
            ariaLabel={summary}
            height={height}
            initialWidth={720}
            tooltip={{
              format: (point) =>
                `${point.datum.year} · ${point.datum.bandLabel} · ${point.datum.value}`,
            }}
          />
        </div>
      </section>
      {caption && (
        <figcaption className="mt-2 font-mono text-xs text-zinc-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
