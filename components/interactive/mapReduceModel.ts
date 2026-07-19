/**
 * Pure model for the MapReduceViz interactive: a deterministic, seeded
 * timeline of one AWS-Batch-style map/reduce run. The component renders
 * `stateAt(plan, t)` — all timing/randomness lives here so the run is
 * reproducible and unit-testable, and the renderer stays dumb.
 */

export type Phase = 'idle' | 'split' | 'map' | 'reduce' | 'done';

export type MapperStatus =
  | 'queued'
  | 'running'
  | 'reclaimed'
  | 'retrying'
  | 'done';

export interface MapperFrame {
  index: number;
  status: MapperStatus;
  /** 0..1 across the mapper's current attempt. */
  progress: number;
  /** True if this mapper's spot instance gets reclaimed mid-run. */
  hasReclaim: boolean;
}

export interface Frame {
  phase: Phase;
  t: number;
  /** 0..1 through the split phase. */
  splitProgress: number;
  mappers: MapperFrame[];
  completedMappers: number;
  /** 0..1 through the reduce phase. */
  reduceProgress: number;
}

export interface RunConfig {
  mappers: number;
  seed: number;
  /** Simulate one mapper losing its spot instance and retrying. */
  spotReclaim: boolean;
}

interface MapperPlan {
  index: number;
  start: number;
  /** Duration of the first attempt (full duration if no reclaim). */
  duration: number;
  /** Absolute time the spot instance is reclaimed (undefined = no reclaim). */
  reclaimAt?: number;
  /** Absolute time the retry attempt starts. */
  retryStart?: number;
  retryDuration?: number;
  /** Absolute completion time. */
  end: number;
}

export interface RunPlan {
  config: RunConfig;
  splitDuration: number;
  mapStart: number;
  mappers: MapperPlan[];
  reduceStart: number;
  reduceDuration: number;
  /** End of the whole run (reduce end + a short done-hold). */
  total: number;
}

/** Small deterministic PRNG (mulberry32) so runs replay identically. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SPLIT_DURATION = 1.4;
const REDUCE_DURATION = 1.8;
const DONE_HOLD = 0.8;
const RECLAIM_GAP = 0.6;

export function buildRun(config: RunConfig): RunPlan {
  const rand = mulberry32(config.seed);
  const mapStart = SPLIT_DURATION;

  // Pick the reclaimed mapper up front so the choice is seed-stable.
  const reclaimIndex = config.spotReclaim
    ? Math.floor(rand() * config.mappers)
    : -1;

  const mappers: MapperPlan[] = [];
  for (let index = 0; index < config.mappers; index++) {
    const start = mapStart + index * 0.07 + rand() * 0.25;
    const duration = 1.6 + rand() * 1.9;
    if (index === reclaimIndex) {
      const reclaimAt = start + duration * (0.4 + rand() * 0.3);
      const retryStart = reclaimAt + RECLAIM_GAP;
      const retryDuration = duration * (0.85 + rand() * 0.2);
      mappers.push({
        index,
        start,
        duration,
        reclaimAt,
        retryStart,
        retryDuration,
        end: retryStart + retryDuration,
      });
    } else {
      mappers.push({ index, start, duration, end: start + duration });
    }
  }

  const reduceStart = Math.max(...mappers.map((m) => m.end)) + 0.3;
  return {
    config,
    splitDuration: SPLIT_DURATION,
    mapStart,
    mappers,
    reduceStart,
    reduceDuration: REDUCE_DURATION,
    total: reduceStart + REDUCE_DURATION + DONE_HOLD,
  };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function mapperAt(plan: MapperPlan, t: number): MapperFrame {
  const hasReclaim = plan.reclaimAt !== undefined;
  if (t < plan.start) {
    return { index: plan.index, status: 'queued', progress: 0, hasReclaim };
  }
  if (t >= plan.end) {
    return { index: plan.index, status: 'done', progress: 1, hasReclaim };
  }
  if (hasReclaim && plan.reclaimAt !== undefined) {
    if (t < plan.reclaimAt) {
      return {
        index: plan.index,
        status: 'running',
        progress: clamp01((t - plan.start) / plan.duration),
        hasReclaim,
      };
    }
    if (plan.retryStart !== undefined && t < plan.retryStart) {
      return {
        index: plan.index,
        status: 'reclaimed',
        progress: 0,
        hasReclaim,
      };
    }
    if (plan.retryStart !== undefined && plan.retryDuration !== undefined) {
      return {
        index: plan.index,
        status: 'retrying',
        progress: clamp01((t - plan.retryStart) / plan.retryDuration),
        hasReclaim,
      };
    }
  }
  return {
    index: plan.index,
    status: 'running',
    progress: clamp01((t - plan.start) / plan.duration),
    hasReclaim,
  };
}

export function stateAt(plan: RunPlan, t: number): Frame {
  const mappers = plan.mappers.map((m) => mapperAt(m, t));
  const completedMappers = mappers.filter((m) => m.status === 'done').length;
  const splitProgress = clamp01(t / plan.splitDuration);
  const reduceProgress = clamp01((t - plan.reduceStart) / plan.reduceDuration);

  let phase: Phase;
  if (t <= 0) phase = 'idle';
  else if (t < plan.splitDuration) phase = 'split';
  else if (t < plan.reduceStart) phase = 'map';
  else if (t < plan.reduceStart + plan.reduceDuration) phase = 'reduce';
  else phase = 'done';

  return { phase, t, splitProgress, mappers, completedMappers, reduceProgress };
}

/** Phase boundary times, used by the reduced-motion stepper. */
export function phaseTimes(
  plan: RunPlan,
): Record<Exclude<Phase, 'idle'>, number> {
  return {
    split: plan.splitDuration * 0.55,
    map: plan.mapStart + (plan.reduceStart - plan.mapStart) * 0.6,
    reduce: plan.reduceStart + plan.reduceDuration * 0.5,
    done: plan.total,
  };
}
