import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface RouterRow {
  /** Task column of the where-to-look table. */
  label: string;
  /** Location column. */
  path: string;
  /** The row the query resolves to. */
  match?: boolean;
}

export interface ContextBlock {
  /** File / command the context comes from (e.g. "uv run help"). */
  source: string;
  lines: string[];
  /**
   * Render as an emulated terminal window: the full output is present from the
   * start, and the viewport scrolls down through it — instead of streaming
   * lines in behind skeletons.
   */
  terminal?: boolean;
  /**
   * The one relevant line (index, or substring matched against lines). The
   * scroll eases it into view, then it highlights while the rest dims.
   * Omit to simply scroll through to the end of the output.
   */
  highlight?: number | string;
}

export interface QueryScenario {
  /** Short label for the picker chip. */
  chip: string;
  /** The full query typed at the prompt. */
  query: string;
  /** The AGENTS.md where-to-look table the router scans. */
  routerRows: RouterRow[];
  /** Breadcrumb of hops after the match, e.g. ["AGENTS.md", "uv run help"]. */
  route: string[];
  /** Context blocks that load one after another. */
  context: ContextBlock[];
  /** The resolved answer line. */
  answer: string;
}

interface QueryRouterProps {
  title?: string;
  scenarios: QueryScenario[];
}

/**
 * Phases of one routing run. typing → routing advance on timers; `loading`
 * advances when each context block reports completion; prefers-reduced-motion
 * jumps straight to `done` with everything resolved.
 */
const PHASES = ['typing', 'scanning', 'routing', 'loading', 'done'] as const;
type Phase = (typeof PHASES)[number];

const PHASE_LABEL: Record<Phase, string> = {
  typing: 'reading query…',
  scanning: 'scanning AGENTS.md…',
  routing: 'routing…',
  loading: 'loading context…',
  done: 'context loaded',
};

const at = (phase: Phase) => PHASES.indexOf(phase);

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-3 animate-pulse bg-zinc-800"
      style={{ width }}
      aria-hidden
    />
  );
}

interface BlockProps {
  block: ContextBlock;
  /** This block is the one currently animating. */
  playing: boolean;
  /** This block already finished (or the whole run is done) — show final state. */
  settled: boolean;
  reduceMotion: boolean;
  onComplete: () => void;
}

/** Classic context block: lines stream in one by one behind skeleton loaders. */
function StreamBlock({
  block,
  playing,
  settled,
  reduceMotion,
  onComplete,
}: BlockProps) {
  const [revealed, setRevealed] = useState(settled ? block.lines.length : 0);
  const completedRef = useRef(false);
  const complete = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    if (settled) setRevealed(block.lines.length);
  }, [settled, block.lines.length]);

  useEffect(() => {
    if (!playing) return;
    if (reduceMotion) {
      setRevealed(block.lines.length);
      complete();
      return;
    }
    if (revealed >= block.lines.length) {
      const t = setTimeout(complete, 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setRevealed((n) => n + 1), 160);
    return () => clearTimeout(t);
  }, [playing, revealed, block.lines.length, reduceMotion, complete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      className="border-2 border-zinc-700"
    >
      <p className="border-b-2 border-zinc-700 bg-zinc-900 px-3 py-1 text-xs uppercase text-zinc-400">
        {block.source}
      </p>
      <div className="space-y-1 px-3 py-2">
        {block.lines.map((line, i) =>
          i < revealed ? (
            <motion.p
              key={`${i}-${line}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.15 }}
              className="text-xs text-zinc-300"
            >
              {line}
            </motion.p>
          ) : (
            <SkeletonLine
              key={`${i}-${line}`}
              width={`${45 + ((i * 23) % 45)}%`}
            />
          ),
        )}
      </div>
    </motion.div>
  );
}

const LINE_H = 24;
const VISIBLE_LINES = 7;
const WINDOW_H = LINE_H * VISIBLE_LINES;

/**
 * Emulated terminal window: the command's full (fake) output exists up front;
 * the viewport scrolls down through it and eases the one relevant line into
 * view, which then highlights while the rest of the output dims.
 */
function TerminalBlock({
  block,
  playing,
  settled,
  reduceMotion,
  onComplete,
}: BlockProps) {
  const highlightIdx =
    typeof block.highlight === 'number'
      ? block.highlight
      : block.highlight
        ? block.lines.findIndex((l) => l.includes(block.highlight as string))
        : -1;

  const maxOffset = Math.max(0, block.lines.length * LINE_H - WINDOW_H);
  const target =
    highlightIdx >= 0
      ? Math.min(
          maxOffset,
          Math.max(0, highlightIdx * LINE_H - (WINDOW_H - LINE_H) / 2),
        )
      : maxOffset;

  const finalState = settled || reduceMotion;
  const [highlighted, setHighlighted] = useState(finalState);
  const completedRef = useRef(false);
  const complete = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    if (finalState) setHighlighted(true);
  }, [finalState]);

  useEffect(() => {
    if (playing && reduceMotion) complete();
  }, [playing, reduceMotion, complete]);

  const scrollDuration = Math.min(2.4, 0.6 + (target / LINE_H) * 0.14);

  return (
    <motion.div
      initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      className="border-2 border-zinc-700"
    >
      <p className="border-b-2 border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
        <span className="text-brutalist-cyan">$</span>{' '}
        <span className="uppercase">{block.source}</span>
      </p>
      <div
        className="relative overflow-hidden px-3"
        style={{ height: WINDOW_H }}
      >
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: playing || finalState ? -target : 0 }}
          transition={{
            duration: finalState ? 0 : scrollDuration,
            ease: 'easeInOut',
            delay: finalState ? 0 : 0.5,
          }}
          onAnimationComplete={() => {
            if (!playing) return;
            setHighlighted(true);
            const t = setTimeout(complete, 650);
            return () => clearTimeout(t);
          }}
        >
          {block.lines.map((line, i) => (
            <p
              key={`${i}-${line}`}
              style={{ height: LINE_H, lineHeight: `${LINE_H}px` }}
              className={`truncate whitespace-pre text-xs transition-colors duration-300 ${
                highlighted && i === highlightIdx
                  ? '-mx-1 bg-brutalist-cyan px-1 font-bold text-black'
                  : highlighted && highlightIdx >= 0
                    ? 'text-zinc-600'
                    : 'text-zinc-300'
              }`}
            >
              {line || ' '}
            </p>
          ))}
        </motion.div>
        {/* viewport edge fades — sells the "window over longer output" effect */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black to-transparent" />
      </div>
    </motion.div>
  );
}

/**
 * Interactive query-routing simulator for MDX: type-in query → the AGENTS.md
 * where-to-look table scans in as skeleton rows and resolves to a match → the
 * route breadcrumb draws → context blocks load one after another (streaming
 * lines, or an emulated terminal window scrolling to the relevant output) →
 * the answer lands. Loaded via next/dynamic in MDXComponents, so pages that
 * don't use it ship none of it.
 */
export default function QueryRouter({ title, scenarios }: QueryRouterProps) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [typedChars, setTypedChars] = useState(0);
  const [activeBlock, setActiveBlock] = useState(0);
  const reduceMotion = useReducedMotion();

  const scenario = scenarios[Math.min(scenarioIndex, scenarios.length - 1)];

  const run = (index: number) => {
    setScenarioIndex(index);
    setTypedChars(0);
    setActiveBlock(0);
    setPhase('typing');
  };

  // Reduced motion: no timers, no skeletons — land fully resolved.
  useEffect(() => {
    if (reduceMotion) {
      setTypedChars(scenario.query.length);
      setActiveBlock(scenario.context.length);
      setPhase('done');
    }
  }, [reduceMotion, scenario]);

  // Typewriter for the prompt line.
  useEffect(() => {
    if (reduceMotion || phase !== 'typing') return;
    if (typedChars >= scenario.query.length) {
      const pause = setTimeout(() => setPhase('scanning'), 250);
      return () => clearTimeout(pause);
    }
    const tick = setTimeout(() => setTypedChars((n) => n + 1), 26);
    return () => clearTimeout(tick);
  }, [phase, typedChars, scenario, reduceMotion]);

  // Router scan → match.
  useEffect(() => {
    if (reduceMotion || phase !== 'scanning') return;
    const t = setTimeout(() => setPhase('routing'), 1000);
    return () => clearTimeout(t);
  }, [phase, reduceMotion]);

  // Route drawn → start loading context.
  useEffect(() => {
    if (reduceMotion || phase !== 'routing') return;
    const t = setTimeout(() => setPhase('loading'), 1100);
    return () => clearTimeout(t);
  }, [phase, reduceMotion]);

  // Context blocks advance as each one reports completion.
  const onBlockComplete = useCallback(
    (index: number) => {
      if (index + 1 < scenario.context.length) {
        setActiveBlock(index + 1);
      } else {
        setPhase('done');
      }
    },
    [scenario.context.length],
  );

  const fade = (visible: boolean) => ({
    initial: { opacity: 0, y: reduceMotion ? 0 : 6 },
    animate: { opacity: visible ? 1 : 0, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.25 },
  });

  return (
    <section
      className="not-prose my-6 border-2 border-white bg-black font-mono text-sm"
      aria-label={title ?? 'Query router'}
    >
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-white bg-zinc-900 px-4 py-2">
        <p className="text-xs font-bold uppercase tracking-widest text-brutalist-yellow">
          [ {title ?? 'query router'} ]
        </p>
        <output className="text-xs text-zinc-400">{PHASE_LABEL[phase]}</output>
      </div>

      {scenarios.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b-2 border-zinc-800 px-4 py-2">
          {scenarios.map((s, i) => (
            <button
              key={s.chip}
              type="button"
              onClick={() => run(i)}
              className={`border-2 px-2 py-1 text-xs font-bold uppercase transition-colors ${
                i === scenarioIndex
                  ? 'border-brutalist-cyan bg-brutalist-cyan text-black'
                  : 'border-zinc-600 text-zinc-300 hover:border-white hover:text-white'
              }`}
            >
              {s.chip}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4 px-4 py-4">
        {/* Prompt */}
        <p className="text-brutalist-cyan">
          <span className="font-bold">&gt;</span>{' '}
          <span className="text-white">
            {scenario.query.slice(0, typedChars)}
          </span>
          {phase !== 'done' && (
            <span className="animate-pulse text-brutalist-cyan">▌</span>
          )}
        </p>

        {/* AGENTS.md router table */}
        {at(phase) >= at('scanning') && (
          <motion.div {...fade(true)} className="border-2 border-zinc-700">
            <p className="border-b-2 border-zinc-700 bg-zinc-900 px-3 py-1 text-xs uppercase text-brutalist-yellow">
              AGENTS.md :: where to look
            </p>
            <div className="space-y-1 px-3 py-2">
              {scenario.routerRows.map((row, i) =>
                phase === 'scanning' ? (
                  <SkeletonLine
                    key={row.label}
                    width={`${55 + ((i * 17) % 35)}%`}
                  />
                ) : (
                  <motion.div
                    key={row.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.2,
                      delay: reduceMotion ? 0 : i * 0.08,
                    }}
                    className={`flex flex-wrap justify-between gap-x-4 px-1 text-xs ${
                      row.match
                        ? 'bg-brutalist-cyan font-bold text-black'
                        : 'text-zinc-500'
                    }`}
                  >
                    <span>{row.label}</span>
                    <span>{row.path}</span>
                  </motion.div>
                ),
              )}
            </div>
          </motion.div>
        )}

        {/* Route breadcrumb */}
        {at(phase) >= at('routing') && (
          <motion.p {...fade(true)} className="text-xs">
            <span className="uppercase text-brutalist-yellow">route:</span>{' '}
            {scenario.route.map((hop, i) => (
              <motion.span
                key={hop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.15,
                  delay: reduceMotion ? 0 : i * 0.25,
                }}
                className="text-white"
              >
                {i > 0 && <span className="text-brutalist-pink"> → </span>}
                {hop}
              </motion.span>
            ))}
          </motion.p>
        )}

        {/* Context blocks — streaming or terminal-window, one after another */}
        {at(phase) >= at('loading') &&
          scenario.context.map((block, i) => {
            if (phase !== 'done' && i > activeBlock) return null;
            const playing = phase === 'loading' && i === activeBlock;
            const settled = phase === 'done' || i < activeBlock;
            const Block = block.terminal ? TerminalBlock : StreamBlock;
            return (
              <Block
                key={`${scenarioIndex}-${block.source}`}
                block={block}
                playing={playing}
                settled={settled}
                reduceMotion={!!reduceMotion}
                onComplete={() => onBlockComplete(i)}
              />
            );
          })}

        {/* Answer */}
        <AnimatePresence>
          {phase === 'done' && (
            <motion.div
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
              className="border-2 border-brutalist-cyan bg-zinc-900 px-3 py-2"
            >
              <p className="text-xs font-bold uppercase text-brutalist-cyan">
                [ resolved ]
              </p>
              <p className="mt-1 text-sm text-white">{scenario.answer}</p>
              <p className="mt-2 text-xs text-zinc-500">
                context loaded · {scenario.context.length} source
                {scenario.context.length === 1 ? '' : 's'} — only the slice of
                the world this query touches
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'done' && !reduceMotion && (
          <button
            type="button"
            onClick={() => run(scenarioIndex)}
            className="border-2 border-white px-3 py-1 text-xs font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            replay
          </button>
        )}
      </div>
    </section>
  );
}
