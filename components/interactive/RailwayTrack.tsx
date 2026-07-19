import { RotateCcw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Railway Oriented Programming, animated. A value rides the success rail
 * through a pipeline of steps; at the failing step `bind` switches it onto
 * the failure rail, where it bypasses every remaining step and slides
 * straight to the output. Prototype for the ROP talk.
 *
 * Deterministic: `railFrameAt(t, cfg)` is pure, so the render is
 * reproducible/snapshotable and the clock is the only stateful part.
 */

export interface RailStep {
  label: string;
  op: string;
}

export interface RailConfig {
  steps: RailStep[];
  /** Index of the step that fails, or -1 for an all-success run. */
  failAt: number;
}

export interface RailFrame {
  /** 0..1 across the whole pipeline (station space normalised). */
  x: number;
  rail: 'success' | 'failure';
  activeStep: number;
  /** The value label carried by the token. */
  value: 'Ok' | 'Error';
  switching: boolean;
  done: boolean;
}

const STEP_DUR = 1.15;
const TAIL = 1.0;

export function railTotal(cfg: RailConfig): number {
  return cfg.steps.length * STEP_DUR + TAIL;
}

export function railFrameAt(t: number, cfg: RailConfig): RailFrame {
  const n = cfg.steps.length;
  const u = Math.min(t / STEP_DUR, n); // station-space position 0..n
  const failed = cfg.failAt >= 0;
  const switchU = failed ? cfg.failAt + 0.5 : Number.POSITIVE_INFINITY;
  const onFailure = u >= switchU;
  const switching = failed && Math.abs(u - switchU) < 0.28;
  return {
    x: u / n,
    rail: onFailure ? 'failure' : 'success',
    activeStep: Math.min(Math.floor(u), n - 1),
    value: onFailure ? 'Error' : 'Ok',
    switching,
    done: t >= railTotal(cfg) - 1e-6,
  };
}

const C = {
  cyan: 'var(--brutalist-cyan, #22d3ee)',
  pink: 'var(--brutalist-pink, #ec4899)',
  ink: 'var(--color-white, #ffffff)',
  muted: 'var(--color-zinc-600, #52525b)',
  dim: 'var(--color-zinc-800, #27272a)',
};

const DEFAULT_STEPS: RailStep[] = [
  { label: 'validate', op: 'bind' },
  { label: 'parse', op: 'bind' },
  { label: 'save', op: 'bind' },
  { label: 'format', op: 'map' },
];

interface Props {
  steps?: RailStep[];
  failAt?: number;
  autoplay?: boolean;
}

const VB_W = 720;
const VB_H = 220;
const SUCCESS_Y = 70;
const FAILURE_Y = 165;
const PAD = 60;

export default function RailwayTrack({
  steps = DEFAULT_STEPS,
  failAt = 2,
  autoplay = true,
}: Props) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);
  const [failIdx, setFailIdx] = useState(failAt);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const cfg = useMemo<RailConfig>(
    () => ({ steps, failAt: failIdx }),
    [steps, failIdx],
  );
  const total = railTotal(cfg);
  const frame = railFrameAt(reduceMotion ? total : t, cfg);

  const restart = (nextFail = failIdx) => {
    setFailIdx(nextFail);
    setT(0);
    setPlaying(!reduceMotion);
    setStarted(true);
  };

  useEffect(() => {
    if (!autoplay || started || reduceMotion) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      setPlaying(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
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

  useEffect(() => {
    if (!playing || reduceMotion) return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) {
        const dt = (now - last) / 1000;
        setT((p) => {
          const next = p + dt;
          if (next >= total) {
            setPlaying(false);
            return total;
          }
          return next;
        });
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total, reduceMotion]);

  const n = steps.length;
  const stationX = (i: number) => PAD + ((i + 0.5) / n) * (VB_W - 2 * PAD);
  const tokenX = PAD + frame.x * (VB_W - 2 * PAD);
  const tokenY =
    frame.rail === 'failure'
      ? frame.switching
        ? SUCCESS_Y + (FAILURE_Y - SUCCESS_Y) * 0.5
        : FAILURE_Y
      : SUCCESS_Y;
  const tokenColor = frame.rail === 'failure' ? C.pink : C.cyan;

  return (
    <figure className="my-6">
      <section
        ref={ref}
        aria-label={`Railway oriented programming: a value rides the success rail through ${n} steps${failIdx >= 0 ? `, fails at "${steps[failIdx].label}", and switches to the failure rail` : ' and succeeds'}.`}
        className="border-2 border-white bg-black shadow-hard-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-white bg-zinc-900 px-3 py-2">
          <span className="font-mono text-xs font-bold text-white">
            RAILWAY.SIM
          </span>
          <div className="flex items-center gap-1">
            <span className="mr-1 font-mono text-[10px] text-zinc-500">
              FAIL_AT:
            </span>
            {steps.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => restart(i)}
                aria-label={`Fail at ${s.label}`}
                className={`border-2 border-white px-2 py-1 font-mono text-[10px] transition-colors ${
                  failIdx === i
                    ? 'bg-brutalist-pink text-black'
                    : 'bg-black text-white hover:bg-zinc-900'
                }`}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => restart(-1)}
              aria-label="All steps succeed"
              className={`border-2 border-white px-2 py-1 font-mono text-[10px] transition-colors ${
                failIdx === -1
                  ? 'bg-brutalist-cyan text-black'
                  : 'bg-black text-white hover:bg-zinc-900'
              }`}
            >
              none
            </button>
            <button
              type="button"
              onClick={() => restart(failIdx)}
              aria-label="Replay"
              className="border-2 border-white bg-black px-2 py-1 text-white hover:bg-zinc-900"
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full"
          role="img"
          aria-hidden
        >
          <title>Railway track</title>
          {/* Rails */}
          <line
            x1={PAD}
            y1={SUCCESS_Y}
            x2={VB_W - PAD}
            y2={SUCCESS_Y}
            stroke={C.cyan}
            strokeWidth={3}
          />
          <line
            x1={PAD}
            y1={FAILURE_Y}
            x2={VB_W - PAD}
            y2={FAILURE_Y}
            stroke={C.pink}
            strokeWidth={3}
            strokeDasharray="2 6"
            opacity={0.6}
          />
          {/* Rail labels */}
          <text
            x={8}
            y={SUCCESS_Y + 4}
            fill={C.cyan}
            className="font-mono"
            fontSize={11}
          >
            Ok
          </text>
          <text
            x={2}
            y={FAILURE_Y + 4}
            fill={C.pink}
            className="font-mono"
            fontSize={11}
          >
            Err
          </text>
          {/* Stations */}
          {steps.map((s, i) => {
            const x = stationX(i);
            const bypassed = frame.rail === 'failure' && i > failIdx;
            const active = frame.activeStep === i && !bypassed;
            return (
              <g key={s.label} opacity={bypassed ? 0.3 : 1}>
                <rect
                  x={x - 42}
                  y={SUCCESS_Y - 20}
                  width={84}
                  height={40}
                  fill={active ? C.cyan : C.dim}
                  stroke={C.ink}
                  strokeWidth={2}
                />
                <text
                  x={x}
                  y={SUCCESS_Y - 2}
                  fill={active ? '#000' : C.ink}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize={12}
                >
                  {s.label}
                </text>
                <text
                  x={x}
                  y={SUCCESS_Y + 13}
                  fill={active ? '#000' : C.muted}
                  textAnchor="middle"
                  className="font-mono"
                  fontSize={9}
                >
                  {s.op}
                </text>
                {i === failIdx && (
                  <text
                    x={x}
                    y={SUCCESS_Y - 28}
                    fill={C.pink}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize={10}
                  >
                    ✗ fails → switch
                  </text>
                )}
              </g>
            );
          })}
          {/* Output */}
          <text
            x={VB_W - PAD + 6}
            y={(frame.rail === 'failure' ? FAILURE_Y : SUCCESS_Y) + 4}
            fill={frame.rail === 'failure' ? C.pink : C.cyan}
            className="font-mono"
            fontSize={11}
          >
            {frame.value === 'Error' ? 'Error e' : 'Ok x'}
          </text>
          {/* Token */}
          <circle
            cx={tokenX}
            cy={tokenY}
            r={9}
            fill={tokenColor}
            stroke={C.ink}
            strokeWidth={2}
          />
        </svg>

        {reduceMotion && (
          <div className="flex items-center gap-1 border-t-2 border-white px-3 py-2">
            <span className="font-mono text-[10px] text-zinc-500">STEP:</span>
            {[0, 0.5, 1].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setT(total * f)}
                className="border-2 border-white bg-black px-2 py-1 font-mono text-[10px] text-white hover:bg-zinc-900"
              >
                {f === 0 ? 'start' : f === 0.5 ? 'mid' : 'end'}
              </button>
            ))}
          </div>
        )}
      </section>
      <figcaption className="mt-2 text-center font-mono text-xs text-zinc-500">
        Railway Oriented Programming — `bind` keeps you on the success rail; one
        failure switches the track and short-circuits the rest.
      </figcaption>
    </figure>
  );
}
