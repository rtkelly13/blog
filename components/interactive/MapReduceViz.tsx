import { Pause, Play, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildRun,
  type Frame,
  type JobFrame,
  type JobKind,
  type Phase,
  phaseTimes,
  stateAt,
} from './mapReduceModel';

interface MapReduceVizProps {
  title?: string;
  caption?: string;
  /** Number of parallel map jobs (the array-job size). */
  mappers?: number;
  /** Compute-environment slots (max concurrent jobs). */
  slots?: number;
  /** Simulate one map job losing its spot instance and retrying. */
  spotReclaim?: boolean;
  autoplay?: boolean;
}

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'READY',
  prepare: 'PREPARE',
  map: 'MAP',
  reduce: 'REDUCE',
  done: 'DONE',
};

/** Colour code per job type — the legend of the whole diagram. */
const KIND_BAR: Record<JobKind, string> = {
  prepare: 'bg-brutalist-cyan',
  map: 'bg-brutalist-pink',
  reduce: 'bg-brutalist-yellow',
};
const KIND_TEXT: Record<JobKind, string> = {
  prepare: 'text-brutalist-cyan',
  map: 'text-brutalist-pink',
  reduce: 'text-brutalist-yellow',
};
const KIND_BORDER: Record<JobKind, string> = {
  prepare: 'border-brutalist-cyan',
  map: 'border-brutalist-pink',
  reduce: 'border-brutalist-yellow',
};
/** The active-phase highlight follows the job-type colour code. */
const PHASE_ACTIVE: Record<Exclude<Phase, 'idle'>, string> = {
  prepare: 'bg-brutalist-cyan',
  map: 'bg-brutalist-pink',
  reduce: 'bg-brutalist-yellow',
  done: 'bg-white',
};

function jobLabel(job: JobFrame): string {
  if (job.kind === 'map') {
    return `MAP[${String(job.index ?? 0).padStart(2, '0')}]`;
  }
  return job.kind === 'prepare' ? 'PREPARE' : 'REDUCE';
}

/** A colour-coded job chip, used in the queue and the done stack. */
function JobChip({ job, note }: { job: JobFrame; note?: string }) {
  const requeued = job.status === 'requeued';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-2 border border-white bg-zinc-900 px-1.5 py-0.5"
    >
      <span
        aria-hidden
        className={`inline-block h-2.5 w-2.5 shrink-0 ${
          requeued ? 'bg-brutalist-cyberOrange' : KIND_BAR[job.kind]
        }`}
      />
      <span
        className={`font-mono text-[11px] ${
          requeued ? 'text-brutalist-cyberOrange' : KIND_TEXT[job.kind]
        }`}
      >
        {jobLabel(job)}
      </span>
      {(note ?? (requeued ? 'RETRY' : undefined)) && (
        <span className="ml-auto font-mono text-[10px] text-zinc-500">
          {note ?? 'RETRY'}
        </span>
      )}
    </motion.div>
  );
}

function SlotRow({
  slotIndex,
  job,
}: {
  slotIndex: number;
  job: JobFrame | undefined;
}) {
  return (
    <div className="flex items-center gap-2 py-1 font-mono text-xs">
      <span className="w-14 shrink-0 text-zinc-600">vCPU_{slotIndex}</span>
      {job ? (
        <>
          <span className={`w-20 shrink-0 ${KIND_TEXT[job.kind]}`}>
            {jobLabel(job)}
          </span>
          <div className="h-2 min-w-0 flex-1 border border-white bg-zinc-900">
            <div
              className={`h-full ${KIND_BAR[job.kind]}`}
              style={{ width: `${Math.round(job.progress * 100)}%` }}
            />
          </div>
          <span
            className={`w-16 shrink-0 text-right text-[10px] ${
              job.hasReclaim ? 'text-brutalist-cyberOrange' : 'text-zinc-500'
            }`}
          >
            {job.hasReclaim ? 'SPOT' : 'RUNNING'}
          </span>
        </>
      ) : (
        <span className="min-w-0 flex-1 text-zinc-700">— idle —</span>
      )}
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
  title = 'BATCH_PIPELINE.SIM',
  caption,
  mappers = 8,
  slots = 4,
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
        slots,
        spotReclaim,
      }),
    [mapperCount, runKey, slots, spotReclaim],
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

  const jobsById = useMemo(() => {
    const m = new Map<string, JobFrame>();
    for (const j of frame.jobs) m.set(j.id, j);
    return m;
  }, [frame.jobs]);

  const queuedJobs = frame.queue
    .map((id) => jobsById.get(id))
    .filter((j): j is JobFrame => j !== undefined);
  const pendingJobs = frame.jobs.filter((j) => j.status === 'pending');
  const doneJobs = frame.jobs.filter((j) => j.status === 'done');
  const reducePct = Math.round(frame.reduceProgress * 100);

  return (
    <figure className="my-6">
      <section
        ref={containerRef}
        aria-label={`Animated batch pipeline simulation: a PREPARE job splits the input, ${mapperCount} MAP array jobs flow through a ${plan.config.slots}-slot compute environment, and a REDUCE job merges the results. Current phase: ${PHASE_LABEL[frame.phase]}.`}
        className="border-2 border-white bg-black shadow-hard-lg"
      >
        {/* Title bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-white bg-zinc-900 px-3 py-2">
          <span className="font-mono text-xs font-bold text-white">
            {title}
          </span>
          <div className="flex items-center gap-1" aria-hidden>
            {(['prepare', 'map', 'reduce', 'done'] as const).map((p) => (
              <span
                key={p}
                className={`px-1 font-mono text-[10px] ${
                  frame.phase === p
                    ? `${PHASE_ACTIVE[p]} font-bold text-black`
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

        {/* Legend */}
        <div
          className="flex flex-wrap items-center gap-3 border-b-2 border-white px-3 py-1.5 font-mono text-[10px] text-zinc-500"
          aria-hidden
        >
          <span>JOB_TYPES:</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-brutalist-cyan" /> PREPARE
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-brutalist-pink" /> MAP
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-brutalist-yellow" /> REDUCE
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-brutalist-cyberOrange" />{' '}
            SPOT RECLAIM
          </span>
        </div>

        {/* Reduced-motion phase stepper */}
        {reduceMotion && (
          <div className="flex items-center gap-1 border-b-2 border-white px-3 py-2">
            <span className="font-mono text-[10px] text-zinc-500">
              STEP_THROUGH:
            </span>
            {(['prepare', 'map', 'reduce', 'done'] as const).map((p) => (
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

        {/* Stage: queue → compute environment → succeeded */}
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1.6fr_1fr]">
          {/* Job queue */}
          <div className="min-w-0">
            <div className="mb-2 font-mono text-[10px] text-zinc-500">
              JOB_QUEUE ({queuedJobs.length} runnable)
            </div>
            <div className="flex min-h-32 flex-col gap-1 border-2 border-white p-2">
              <AnimatePresence initial={false}>
                {queuedJobs.map((j) => (
                  <JobChip key={j.id} job={j} />
                ))}
                {pendingJobs.map((j) => (
                  <motion.div
                    key={j.id}
                    layout
                    initial={false}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 border border-dashed border-zinc-700 px-1.5 py-0.5"
                  >
                    <span
                      aria-hidden
                      className={`inline-block h-2.5 w-2.5 shrink-0 border-2 ${KIND_BORDER[j.kind]}`}
                    />
                    <span className="font-mono text-[11px] text-zinc-500">
                      {jobLabel(j)}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-zinc-600">
                      WAITING_DEPS
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {queuedJobs.length === 0 && pendingJobs.length === 0 && (
                <span className="font-mono text-[11px] text-zinc-700">
                  — queue empty —
                </span>
              )}
            </div>
          </div>

          {/* Compute environment */}
          <div className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between font-mono text-[10px] text-zinc-500">
              <span>COMPUTE_ENV ({plan.config.slots} slots)</span>
              <span>AWS_BATCH_JOB_ARRAY_INDEX</span>
            </div>
            <div className="border-2 border-white p-2">
              {frame.slots.map((id, s) => (
                <SlotRow
                  key={`slot-${s}`}
                  slotIndex={s}
                  job={id ? jobsById.get(id) : undefined}
                />
              ))}
            </div>
          </div>

          {/* Succeeded + output */}
          <div className="min-w-0">
            <div className="mb-2 font-mono text-[10px] text-zinc-500">
              SUCCEEDED → OUTPUT
            </div>
            <div className="border-2 border-white bg-zinc-900 p-2">
              <div className="flex max-h-40 flex-col gap-1 overflow-hidden">
                <AnimatePresence initial={false}>
                  {doneJobs.slice(-6).map((j) => (
                    <JobChip key={j.id} job={j} note="OK" />
                  ))}
                </AnimatePresence>
              </div>
              <div className="mt-2 h-2 border border-white bg-zinc-800">
                <div
                  className="h-full bg-brutalist-yellow"
                  style={{ width: `${reducePct}%` }}
                />
              </div>
              <div className="mt-2 font-mono text-[10px] text-zinc-500">
                {frame.completedMaps}/{mapperCount} map results ·{' '}
                {frame.phase === 'done' ? (
                  <span className="bg-brutalist-yellow px-1 font-bold text-black">
                    result written
                  </span>
                ) : frame.phase === 'reduce' ? (
                  `reducing ${reducePct}%`
                ) : (
                  'awaiting reduce'
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
