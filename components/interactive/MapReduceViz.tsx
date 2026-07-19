import { Pause, Play, RotateCcw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildRun,
  type Frame,
  type MapperFrame,
  type Phase,
  phaseTimes,
  stateAt,
} from './mapReduceModel';

interface MapReduceVizProps {
  title?: string;
  caption?: string;
  /** Number of parallel map jobs (the array-job size). */
  mappers?: number;
  /** Simulate one mapper losing its spot instance and retrying. */
  spotReclaim?: boolean;
  autoplay?: boolean;
}

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'READY',
  split: 'SPLIT',
  map: 'MAP',
  reduce: 'REDUCE',
  done: 'DONE',
};

const STATUS_LABEL: Record<MapperFrame['status'], string> = {
  queued: 'QUEUED',
  running: 'RUNNING',
  reclaimed: 'SPOT RECLAIMED',
  retrying: 'RETRY',
  done: 'OK',
};

function statusClass(status: MapperFrame['status']): string {
  switch (status) {
    case 'queued':
      return 'text-zinc-600';
    case 'running':
      return 'text-brutalist-pink';
    case 'reclaimed':
      return 'text-brutalist-cyberOrange';
    case 'retrying':
      return 'text-brutalist-cyberOrange';
    case 'done':
      return 'text-brutalist-cyan';
  }
}

function MapperRow({ mapper }: { mapper: MapperFrame }) {
  const barClass =
    mapper.status === 'retrying'
      ? 'bg-brutalist-cyberOrange'
      : mapper.status === 'done'
        ? 'bg-brutalist-cyan'
        : 'bg-brutalist-pink';
  return (
    <div className="flex items-center gap-2 py-0.5 font-mono text-xs">
      <span className="w-9 shrink-0 text-zinc-500">
        [{String(mapper.index).padStart(2, '0')}]
      </span>
      <div className="h-2 min-w-0 flex-1 border border-white bg-zinc-900">
        <div
          className={`h-full ${barClass}`}
          style={{ width: `${Math.round(mapper.progress * 100)}%` }}
        />
      </div>
      <span
        className={`w-28 shrink-0 text-right ${statusClass(mapper.status)}`}
      >
        {STATUS_LABEL[mapper.status]}
      </span>
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  active = false,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`border-2 border-white px-2 py-1 font-mono text-xs transition-colors ${
        active
          ? 'bg-brutalist-cyan text-black'
          : 'bg-black text-white hover:bg-zinc-900'
      }`}
    >
      {children}
    </button>
  );
}

const MAPPER_OPTIONS = [4, 8, 12];

export default function MapReduceViz({
  title = 'MAP_REDUCE.SIM',
  caption,
  mappers = 8,
  spotReclaim = true,
  autoplay = true,
}: MapReduceVizProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const containerRef = useRef<HTMLElement>(null);
  const [mapperCount, setMapperCount] = useState(mappers);
  const [runKey, setRunKey] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const plan = useMemo(
    () =>
      buildRun({
        mappers: mapperCount,
        seed: runKey * 7919 + mapperCount,
        spotReclaim,
      }),
    [mapperCount, runKey, spotReclaim],
  );
  const frame: Frame = useMemo(() => stateAt(plan, t), [plan, t]);
  const boundaries = useMemo(() => phaseTimes(plan), [plan]);

  const replay = useCallback(() => {
    setRunKey((k) => k + 1);
    setT(0);
    setPlaying(true);
    setStarted(true);
  }, []);

  // Autoplay when scrolled into view (mirrors Terminal).
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

  // Reduced motion: land on the finished state; the phase stepper drives it.
  useEffect(() => {
    if (reduceMotion) {
      setStarted(true);
      setPlaying(false);
      setT(plan.total);
    }
  }, [reduceMotion, plan.total]);

  // The clock: requestAnimationFrame while playing.
  useEffect(() => {
    if (!playing || reduceMotion) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) {
        const dt = (now - last) / 1000;
        setT((prev) => {
          const next = prev + dt;
          if (next >= plan.total) {
            setPlaying(false);
            return plan.total;
          }
          return next;
        });
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, plan.total, reduceMotion]);

  const chunkCount = mapperCount;
  const visibleChunks = Math.round(frame.splitProgress * chunkCount);
  const mergedResults = frame.completedMappers;
  const reducePct = Math.round(frame.reduceProgress * 100);

  return (
    <figure className="my-6">
      <section
        ref={containerRef}
        aria-label={`Animated map/reduce simulation: an input is split into ${chunkCount} chunks, processed by ${chunkCount} parallel map jobs, and merged by a reduce job. Current phase: ${PHASE_LABEL[frame.phase]}.`}
        className="border-2 border-white bg-black shadow-hard-lg"
      >
        {/* Title bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-white bg-zinc-900 px-3 py-2">
          <span className="font-mono text-xs font-bold text-white">
            {title}
          </span>
          <div className="flex items-center gap-1" aria-hidden>
            {(['split', 'map', 'reduce', 'done'] as const).map((p) => (
              <span
                key={p}
                className={`px-1 font-mono text-[10px] ${
                  frame.phase === p
                    ? 'bg-brutalist-cyan font-bold text-black'
                    : 'text-zinc-500'
                }`}
              >
                {PHASE_LABEL[p]}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {MAPPER_OPTIONS.map((n) => (
              <ControlButton
                key={n}
                label={`Run with ${n} map jobs`}
                active={mapperCount === n}
                onClick={() => {
                  setMapperCount(n);
                  setT(0);
                  setPlaying(!reduceMotion);
                  setStarted(true);
                }}
              >
                x{n}
              </ControlButton>
            ))}
            {!reduceMotion && (
              <ControlButton
                label={playing ? 'Pause simulation' : 'Play simulation'}
                onClick={() => {
                  if (!playing && t >= plan.total) {
                    replay();
                    return;
                  }
                  setPlaying((p) => !p);
                  setStarted(true);
                }}
              >
                {playing ? <Pause size={12} /> : <Play size={12} />}
              </ControlButton>
            )}
            <ControlButton label="Replay simulation" onClick={replay}>
              <RotateCcw size={12} />
            </ControlButton>
          </div>
        </div>

        {/* Reduced-motion phase stepper */}
        {reduceMotion && (
          <div className="flex items-center gap-1 border-b-2 border-white px-3 py-2">
            <span className="font-mono text-[10px] text-zinc-500">
              STEP_THROUGH:
            </span>
            {(['split', 'map', 'reduce', 'done'] as const).map((p) => (
              <ControlButton
                key={p}
                label={`Show ${PHASE_LABEL[p]} phase`}
                active={frame.phase === p}
                onClick={() => setT(boundaries[p])}
              >
                {PHASE_LABEL[p]}
              </ControlButton>
            ))}
          </div>
        )}

        {/* Stage */}
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_2fr_1fr]">
          {/* Input / split */}
          <div className="min-w-0">
            <div className="mb-2 font-mono text-[10px] text-zinc-500">
              INPUT → CHUNKS
            </div>
            <div className="border-2 border-white bg-zinc-900 p-2">
              <div className="mb-2 font-mono text-xs text-white">
                input_data
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: chunkCount }, (_, i) => (
                  <motion.span
                    key={i}
                    initial={false}
                    animate={{ opacity: i < visibleChunks ? 1 : 0.15 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    className="inline-block h-3 w-3 border border-white bg-brutalist-cyan"
                  />
                ))}
              </div>
              <div className="mt-2 font-mono text-[10px] text-zinc-500">
                {visibleChunks}/{chunkCount} chunks
              </div>
            </div>
          </div>

          {/* Mappers (the array job) */}
          <div className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between font-mono text-[10px] text-zinc-500">
              <span>ARRAY_JOB[0..{chunkCount - 1}]</span>
              <span>AWS_BATCH_JOB_ARRAY_INDEX</span>
            </div>
            <div className="border-2 border-white p-2">
              {frame.mappers.map((m) => (
                <MapperRow key={m.index} mapper={m} />
              ))}
            </div>
          </div>

          {/* Reduce / output */}
          <div className="min-w-0">
            <div className="mb-2 font-mono text-[10px] text-zinc-500">
              REDUCE → OUTPUT
            </div>
            <div className="border-2 border-white bg-zinc-900 p-2">
              <div className="mb-2 font-mono text-xs text-white">
                reduce_job
              </div>
              <div className="h-2 border border-white bg-zinc-800">
                <div
                  className="h-full bg-brutalist-yellow"
                  style={{ width: `${reducePct}%` }}
                />
              </div>
              <div className="mt-2 font-mono text-[10px] text-zinc-500">
                {mergedResults}/{chunkCount} results in ·{' '}
                {frame.phase === 'done' ? (
                  <span className="bg-brutalist-yellow px-1 font-bold text-black">
                    result written
                  </span>
                ) : frame.phase === 'reduce' ? (
                  `merging ${reducePct}%`
                ) : (
                  'waiting for mappers'
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      {caption && (
        <figcaption className="mt-2 text-center font-mono text-xs text-zinc-500">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
