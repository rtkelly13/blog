/**
 * Pure model for the MapReduceViz interactive: a deterministic, seeded
 * discrete-event simulation of an AWS-Batch-style pipeline flowing through a
 * job queue into a slot-limited compute environment.
 *
 * The pipeline is three colour-coded job types with dependencies:
 *   PREPARE (one job, splits the input) → MAP (an array job, one child per
 *   chunk) → REDUCE (one job, depends on every map).
 *
 * The compute environment has a fixed number of vCPU slots, so with more map
 * jobs than slots the queue is visible: jobs wait RUNNABLE until a slot
 * frees. One map job can lose its spot instance mid-run — its attempt ends,
 * it re-enters the queue, and it runs again later.
 *
 * All timing/randomness lives here so a run is reproducible and
 * unit-testable; the component just renders `stateAt(plan, t)`.
 */

export type Phase = 'idle' | 'prepare' | 'map' | 'reduce' | 'done';

export type JobKind = 'prepare' | 'map' | 'reduce';

export type JobStatus =
  | 'pending' // dependency not yet satisfied
  | 'runnable' // in the queue, waiting for a slot
  | 'running'
  | 'requeued' // spot instance reclaimed; waiting to run again
  | 'done';

export interface JobSegment {
  slot: number;
  start: number;
  end: number;
  /** False when the segment ends in a spot reclaim instead of completion. */
  completes: boolean;
}

export interface JobPlan {
  id: string;
  kind: JobKind;
  /** Array index for map jobs. */
  index?: number;
  /** The time this job's dependencies are satisfied. */
  readyAt: number;
  segments: JobSegment[];
  /** Completion time (end of the final segment). */
  end: number;
  /** True if this job suffers a spot reclaim. */
  hasReclaim: boolean;
}

export interface JobFrame {
  id: string;
  kind: JobKind;
  index?: number;
  status: JobStatus;
  /** 0..1 across the current/last attempt. */
  progress: number;
  /** Slot occupied while running, else undefined. */
  slot?: number;
  hasReclaim: boolean;
}

export interface Frame {
  phase: Phase;
  t: number;
  jobs: JobFrame[];
  /** Job ids currently waiting (runnable/requeued), in queue order. */
  queue: string[];
  /** Per-slot occupant job id (undefined = idle). */
  slots: (string | undefined)[];
  completedMaps: number;
  /** 0..1 through the reduce job. */
  reduceProgress: number;
}

export interface RunConfig {
  mappers: number;
  seed: number;
  /** Compute-environment slots (max concurrent jobs). */
  slots: number;
  /** Simulate one map job losing its spot instance and retrying. */
  spotReclaim: boolean;
}

export interface RunPlan {
  config: RunConfig;
  jobs: JobPlan[];
  prepareEnd: number;
  reduceStart: number;
  reduceEnd: number;
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

const PICKUP = 0.2; // queue → slot latency
const REQUEUE_DELAY = 0.5; // reclaim → back in the queue
const DONE_HOLD = 1.0;

interface Attempt {
  jobIndex: number; // index into the jobs array
  readyAt: number;
  duration: number;
  /** Fraction of duration at which this attempt is reclaimed (undefined = completes). */
  reclaimFrac?: number;
}

export function buildRun(config: RunConfig): RunPlan {
  const rand = mulberry32(config.seed);
  const slots = Math.max(1, config.slots);

  const prepareDuration = 1.2 + rand() * 0.6;
  const reclaimIndex = config.spotReclaim
    ? Math.floor(rand() * config.mappers)
    : -1;

  const jobs: JobPlan[] = [
    {
      id: 'prepare',
      kind: 'prepare',
      readyAt: 0,
      segments: [],
      end: 0,
      hasReclaim: false,
    },
  ];
  const mapDurations: number[] = [];
  for (let i = 0; i < config.mappers; i++) {
    mapDurations.push(1.3 + rand() * 1.6);
    jobs.push({
      id: `map-${i}`,
      kind: 'map',
      index: i,
      readyAt: 0,
      segments: [],
      end: 0,
      hasReclaim: i === reclaimIndex,
    });
  }
  const reclaimFrac = 0.35 + rand() * 0.35;
  jobs.push({
    id: 'reduce',
    kind: 'reduce',
    readyAt: 0,
    segments: [],
    end: 0,
    hasReclaim: false,
  });

  // Slot free-times for the greedy scheduler.
  const freeAt: number[] = Array.from({ length: slots }, () => 0);
  const runAttempt = (a: Attempt): JobSegment => {
    let slot = 0;
    for (let s = 1; s < slots; s++) {
      if (freeAt[s] < freeAt[slot]) slot = s;
    }
    const start = Math.max(freeAt[slot], a.readyAt) + PICKUP;
    const end =
      a.reclaimFrac !== undefined
        ? start + a.duration * a.reclaimFrac
        : start + a.duration;
    freeAt[slot] = end;
    return { slot, start, end, completes: a.reclaimFrac === undefined };
  };

  // PREPARE runs alone.
  const prepSeg = runAttempt({
    jobIndex: 0,
    readyAt: 0,
    duration: prepareDuration,
  });
  jobs[0].segments.push(prepSeg);
  jobs[0].end = prepSeg.end;
  const prepareEnd = prepSeg.end;

  // MAP array becomes ready when prepare succeeds; process attempts in
  // enqueue order, re-enqueueing the reclaimed attempt at the back.
  const attempts: Attempt[] = [];
  for (let i = 0; i < config.mappers; i++) {
    attempts.push({
      jobIndex: 1 + i,
      readyAt: prepareEnd,
      duration: mapDurations[i],
      reclaimFrac: i === reclaimIndex ? reclaimFrac : undefined,
    });
  }
  for (let k = 0; k < attempts.length; k++) {
    const a = attempts[k];
    const job = jobs[a.jobIndex];
    job.readyAt = prepareEnd;
    const seg = runAttempt(a);
    job.segments.push(seg);
    if (seg.completes) {
      job.end = seg.end;
    } else {
      attempts.push({
        jobIndex: a.jobIndex,
        readyAt: seg.end + REQUEUE_DELAY,
        duration: a.duration * (0.9 + 0.2 * reclaimFrac),
      });
    }
  }

  // REDUCE depends on every map.
  const mapsEnd = Math.max(
    ...jobs.filter((j) => j.kind === 'map').map((j) => j.end),
  );
  const reduceJob = jobs[jobs.length - 1];
  reduceJob.readyAt = mapsEnd;
  const reduceSeg = runAttempt({
    jobIndex: jobs.length - 1,
    readyAt: mapsEnd,
    duration: 1.5 + rand() * 0.5,
  });
  reduceJob.segments.push(reduceSeg);
  reduceJob.end = reduceSeg.end;

  return {
    config: { ...config, slots },
    jobs,
    prepareEnd,
    reduceStart: reduceSeg.start,
    reduceEnd: reduceSeg.end,
    total: reduceSeg.end + DONE_HOLD,
  };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function jobAt(job: JobPlan, t: number): JobFrame {
  const base = {
    id: job.id,
    kind: job.kind,
    index: job.index,
    hasReclaim: job.hasReclaim,
  };
  if (t >= job.end && job.end > 0)
    return { ...base, status: 'done', progress: 1 };
  if (t < job.readyAt) return { ...base, status: 'pending', progress: 0 };

  let lastFailedEnd: number | undefined;
  for (const seg of job.segments) {
    if (t >= seg.start && t < seg.end) {
      return {
        ...base,
        status: 'running',
        progress: clamp01((t - seg.start) / (seg.end - seg.start)),
        slot: seg.slot,
      };
    }
    if (!seg.completes && t >= seg.end) lastFailedEnd = seg.end;
  }
  // Not running: waiting for a slot — either first wait or post-reclaim.
  if (lastFailedEnd !== undefined) {
    return { ...base, status: 'requeued', progress: 0 };
  }
  return { ...base, status: 'runnable', progress: 0 };
}

export function stateAt(plan: RunPlan, t: number): Frame {
  const jobs = plan.jobs.map((j) => jobAt(j, t));

  const queue = jobs
    .filter((j) => j.status === 'runnable' || j.status === 'requeued')
    .map((j) => j.id);
  const slots: (string | undefined)[] = Array.from(
    { length: plan.config.slots },
    () => undefined,
  );
  for (const j of jobs) {
    if (j.status === 'running' && j.slot !== undefined) slots[j.slot] = j.id;
  }
  const completedMaps = jobs.filter(
    (j) => j.kind === 'map' && j.status === 'done',
  ).length;
  const reduceProgress =
    t >= plan.reduceEnd
      ? 1
      : t >= plan.reduceStart
        ? clamp01((t - plan.reduceStart) / (plan.reduceEnd - plan.reduceStart))
        : 0;

  let phase: Phase;
  if (t <= 0) phase = 'idle';
  else if (t < plan.prepareEnd) phase = 'prepare';
  else if (t < plan.reduceStart) phase = 'map';
  else if (t < plan.reduceEnd) phase = 'reduce';
  else phase = 'done';

  return { phase, t, jobs, queue, slots, completedMaps, reduceProgress };
}

/** Phase boundary times, used by the reduced-motion stepper. */
export function phaseTimes(
  plan: RunPlan,
): Record<Exclude<Phase, 'idle'>, number> {
  return {
    prepare: plan.prepareEnd * 0.55,
    map: plan.prepareEnd + (plan.reduceStart - plan.prepareEnd) * 0.55,
    reduce: plan.reduceStart + (plan.reduceEnd - plan.reduceStart) * 0.5,
    done: plan.total,
  };
}
