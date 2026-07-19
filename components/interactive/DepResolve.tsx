import { RotateCcw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * The diamond dependency conflict and its global resolution, animated.
 * App needs A and B; A pins Lib v1, B pins Lib v2 — the classic
 * two-versions-of-one-package problem. Paket's global resolution collapses
 * it to a single version both agree on, then writes the lock. Prototype for
 * the Paket talk.
 */

export type DepPhase = 'graph' | 'conflict' | 'resolve' | 'locked';

export interface DepFrame {
  phase: DepPhase;
  /** 0..1 within the resolve transition (A's edge re-points, v1 fades). */
  resolveProgress: number;
  lockWritten: boolean;
}

const T_GRAPH = 1.6;
const T_CONFLICT = 3.4;
const T_RESOLVE = 5.4;
const TOTAL = 7.0;

export function depTotal(): number {
  return TOTAL;
}

export function depFrameAt(t: number): DepFrame {
  let phase: DepPhase;
  if (t < T_GRAPH) phase = 'graph';
  else if (t < T_CONFLICT) phase = 'conflict';
  else if (t < T_RESOLVE) phase = 'resolve';
  else phase = 'locked';
  const resolveProgress =
    t <= T_CONFLICT
      ? 0
      : t >= T_RESOLVE
        ? 1
        : (t - T_CONFLICT) / (T_RESOLVE - T_CONFLICT);
  return { phase, resolveProgress, lockWritten: phase === 'locked' };
}

const C = {
  cyan: 'var(--brutalist-cyan, #22d3ee)',
  pink: 'var(--brutalist-pink, #ec4899)',
  yellow: 'var(--brutalist-yellow, #facc15)',
  green: 'var(--brutalist-neonGreen, #39ff14)',
  orange: 'var(--brutalist-cyberOrange, #ff8c00)',
  ink: 'var(--color-white, #ffffff)',
  dim: 'var(--color-zinc-800, #27272a)',
  muted: 'var(--color-zinc-600, #52525b)',
};

const VB_W = 460;
const VB_H = 300;
const N = {
  app: { x: 230, y: 40 },
  a: { x: 120, y: 140 },
  b: { x: 340, y: 140 },
  v1: { x: 120, y: 250 },
  v2: { x: 340, y: 250 },
};

function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}

function Node({
  x,
  y,
  label,
  sub,
  color,
  fill,
  opacity = 1,
}: {
  x: number;
  y: number;
  label: string;
  sub?: string;
  color: string;
  fill: string;
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      <rect
        x={x - 48}
        y={y - 22}
        width={96}
        height={44}
        fill={fill}
        stroke={color}
        strokeWidth={2.5}
      />
      <text
        x={x}
        y={sub ? y - 2 : y + 5}
        fill={fill === color ? '#000' : C.ink}
        textAnchor="middle"
        className="font-mono"
        fontSize={12}
      >
        {label}
      </text>
      {sub && (
        <text
          x={x}
          y={y + 13}
          fill={fill === color ? '#000' : C.muted}
          textAnchor="middle"
          className="font-mono"
          fontSize={10}
        >
          {sub}
        </text>
      )}
    </g>
  );
}

const PHASE_LABEL: Record<DepPhase, string> = {
  graph: 'DEPENDENCY GRAPH',
  conflict: '⚠ TWO VERSIONS OF Lib',
  resolve: 'GLOBAL RESOLUTION',
  locked: 'paket.lock WRITTEN',
};

export default function DepResolve({
  autoplay = true,
}: {
  autoplay?: boolean;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const frame = depFrameAt(reduceMotion ? TOTAL : t);

  const restart = () => {
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
          if (next >= TOTAL) {
            setPlaying(false);
            return TOTAL;
          }
          return next;
        });
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduceMotion]);

  const conflict = frame.phase === 'conflict';
  const rp = frame.resolveProgress;
  const resolved = frame.phase === 'resolve' || frame.phase === 'locked';
  // A's edge target migrates from v1 to v2 during resolve.
  const aTargetX = lerp(N.v1.x, N.v2.x, rp);
  const aTargetY = N.v1.y;
  const v1Opacity = 1 - rp;
  const v2Color = resolved ? C.green : C.yellow;

  return (
    <figure className="my-6">
      <section
        ref={ref}
        aria-label="Dependency resolution: App depends on A and B; A wants Lib v1 and B wants Lib v2. Global resolution collapses the conflict to a single version both use, then writes the lock file."
        className="border-2 border-white bg-black shadow-hard-lg"
      >
        <div className="flex items-center justify-between border-b-2 border-white bg-zinc-900 px-3 py-2">
          <span className="font-mono text-xs font-bold text-white">
            RESOLVE.SIM
          </span>
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[11px]"
              style={{
                color: conflict ? C.orange : resolved ? C.green : C.ink,
              }}
            >
              {PHASE_LABEL[frame.phase]}
            </span>
            <button
              type="button"
              onClick={restart}
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
          <title>Dependency resolution</title>
          {/* Edges */}
          <line
            x1={N.app.x}
            y1={N.app.y + 22}
            x2={N.a.x}
            y2={N.a.y - 22}
            stroke={C.muted}
            strokeWidth={2}
          />
          <line
            x1={N.app.x}
            y1={N.app.y + 22}
            x2={N.b.x}
            y2={N.b.y - 22}
            stroke={C.muted}
            strokeWidth={2}
          />
          {/* B -> v2 (stable) */}
          <line
            x1={N.b.x}
            y1={N.b.y + 22}
            x2={N.v2.x}
            y2={N.v2.y - 22}
            stroke={C.muted}
            strokeWidth={2}
          />
          {/* A -> lib: migrates v1 → v2 during resolve */}
          <line
            x1={N.a.x}
            y1={N.a.y + 22}
            x2={aTargetX}
            y2={aTargetY - 22}
            stroke={resolved ? C.green : conflict ? C.orange : C.muted}
            strokeWidth={2.5}
            strokeDasharray={frame.phase === 'resolve' ? '5 4' : undefined}
          />

          <Node {...N.app} label="App" color={C.cyan} fill={C.dim} />
          <Node
            {...N.a}
            label="A"
            sub="wants Lib 1.0"
            color={C.cyan}
            fill={C.dim}
          />
          <Node
            {...N.b}
            label="B"
            sub="wants Lib 2.0"
            color={C.cyan}
            fill={C.dim}
          />
          {/* Lib v1 — pulses in conflict, fades in resolve */}
          <Node
            {...N.v1}
            label="Lib 1.0"
            color={conflict ? C.orange : C.pink}
            fill={C.dim}
            opacity={v1Opacity}
          />
          {/* Lib v2 — the survivor */}
          <Node
            {...N.v2}
            label="Lib 2.0"
            sub={resolved ? 'chosen' : undefined}
            color={conflict ? C.orange : v2Color}
            fill={resolved ? v2Color : C.dim}
          />
        </svg>

        {/* Lock file */}
        <div className="border-t-2 border-white px-3 py-2 font-mono text-[11px]">
          <span className="text-zinc-500">paket.lock </span>
          {frame.lockWritten ? (
            <span className="text-brutalist-neonGreen">
              NUGET → Lib 2.0 (one version, whole solution)
            </span>
          ) : (
            <span className="text-zinc-600">— resolving…</span>
          )}
        </div>

        {reduceMotion && (
          <div className="flex items-center gap-1 border-t-2 border-white px-3 py-2">
            <span className="font-mono text-[10px] text-zinc-500">STEP:</span>
            {(
              [
                ['graph', 0.8],
                ['conflict', 2.4],
                ['resolve', 4.4],
                ['locked', TOTAL],
              ] as const
            ).map(([lbl, at]) => (
              <button
                key={lbl}
                type="button"
                onClick={() => setT(at)}
                className="border-2 border-white bg-black px-2 py-1 font-mono text-[10px] text-white hover:bg-zinc-900"
              >
                {lbl}
              </button>
            ))}
          </div>
        )}
      </section>
      <figcaption className="mt-2 text-center font-mono text-xs text-zinc-500">
        The diamond conflict — two packages pin different versions of one
        dependency — and Paket's single global resolution across the solution.
      </figcaption>
    </figure>
  );
}
