import { RotateCcw } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/**
 * The Elmish / MVU loop, animated. A message travels Model → View → Update
 * → Model, and each full lap changes the model (a counter), so the "single
 * source of truth mutating through a pure update function" is visible.
 * Prototype for the SAFE-stack talk.
 */

export type MvuNode = 'model' | 'view' | 'update';

export interface MvuFrame {
  /** Edge the token is traversing. */
  edge: 'model->view' | 'view->update' | 'update->model';
  /** 0..1 along the current edge. */
  progress: number;
  active: MvuNode;
  /** Model state value; increments once per lap. */
  modelValue: number;
  /** The message currently in flight, shown on view->update. */
  message: string | null;
}

const EDGE_DUR = 1.1;
const LAP = EDGE_DUR * 3;

export function mvuFrameAt(t: number): MvuFrame {
  const lap = Math.floor(t / LAP);
  const within = t - lap * LAP;
  const edgeIdx = Math.min(Math.floor(within / EDGE_DUR), 2);
  const progress = (within - edgeIdx * EDGE_DUR) / EDGE_DUR;
  const edges = ['model->view', 'view->update', 'update->model'] as const;
  const active: MvuNode[] = ['view', 'update', 'model'];
  return {
    edge: edges[edgeIdx],
    progress,
    active: active[edgeIdx],
    // The model updates as the token arrives back at Model (edge 2 done).
    modelValue: lap + (edgeIdx === 2 ? 1 : 0),
    message: edgeIdx === 1 ? 'Increment' : null,
  };
}

const C = {
  cyan: 'var(--brutalist-cyan, #22d3ee)',
  pink: 'var(--brutalist-pink, #ec4899)',
  yellow: 'var(--brutalist-yellow, #facc15)',
  ink: 'var(--color-white, #ffffff)',
  dim: 'var(--color-zinc-800, #27272a)',
  muted: 'var(--color-zinc-600, #52525b)',
};

const VB = 320;
// Triangle node centres.
const NODES: Record<
  MvuNode,
  { x: number; y: number; label: string; color: string }
> = {
  model: { x: VB / 2, y: 70, label: 'Model', color: C.cyan },
  view: { x: VB - 70, y: VB - 80, label: 'View', color: C.yellow },
  update: { x: 70, y: VB - 80, label: 'Update', color: C.pink },
};

function lerp(a: number, b: number, u: number) {
  return a + (b - a) * u;
}

const LAPS_TO_SHOW = 3;

export default function MvuLoop({ autoplay = true }: { autoplay?: boolean }) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  const total = LAP * LAPS_TO_SHOW;
  const frame = mvuFrameAt(reduceMotion ? LAP * 2 : t);

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
        setT((p) => (p + dt >= total ? 0 : p + dt)); // loop forever
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, total, reduceMotion]);

  const [from, to] =
    frame.edge === 'model->view'
      ? (['model', 'view'] as const)
      : frame.edge === 'view->update'
        ? (['view', 'update'] as const)
        : (['update', 'model'] as const);
  const tx = lerp(NODES[from].x, NODES[to].x, frame.progress);
  const ty = lerp(NODES[from].y, NODES[to].y, frame.progress);

  const edgeLabel: Record<MvuFrame['edge'], string> = {
    'model->view': 'render',
    'view->update': `msg: ${frame.message ?? ''}`,
    'update->model': 'new state',
  };

  return (
    <figure className="my-6">
      <section
        ref={ref}
        aria-label="Model-View-Update loop: a message flows from View to Update to a new Model, which re-renders the View. Each lap increments the model counter."
        className="border-2 border-white bg-black shadow-hard-lg"
      >
        <div className="flex items-center justify-between border-b-2 border-white bg-zinc-900 px-3 py-2">
          <span className="font-mono text-xs font-bold text-white">
            MVU.LOOP
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-brutalist-cyan">
              model.count = {frame.modelValue}
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

        <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto]">
          <svg
            viewBox={`0 0 ${VB} ${VB}`}
            className="mx-auto w-full max-w-sm"
            role="img"
            aria-hidden
          >
            <title>MVU loop</title>
            {/* Directed edges (arrows) */}
            {(['model->view', 'view->update', 'update->model'] as const).map(
              (e) => {
                const [f, tN] =
                  e === 'model->view'
                    ? (['model', 'view'] as const)
                    : e === 'view->update'
                      ? (['view', 'update'] as const)
                      : (['update', 'model'] as const);
                const on = frame.edge === e;
                return (
                  <line
                    key={e}
                    x1={NODES[f].x}
                    y1={NODES[f].y}
                    x2={NODES[tN].x}
                    y2={NODES[tN].y}
                    stroke={on ? C.ink : C.muted}
                    strokeWidth={on ? 3 : 1.5}
                    opacity={on ? 1 : 0.5}
                  />
                );
              },
            )}
            {/* Nodes */}
            {(Object.keys(NODES) as MvuNode[]).map((k) => {
              const nd = NODES[k];
              const on = frame.active === k;
              return (
                <g key={k}>
                  <circle
                    cx={nd.x}
                    cy={nd.y}
                    r={38}
                    fill={on ? nd.color : C.dim}
                    stroke={nd.color}
                    strokeWidth={2.5}
                  />
                  <text
                    x={nd.x}
                    y={nd.y + 5}
                    fill={on ? '#000' : C.ink}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize={13}
                  >
                    {nd.label}
                  </text>
                </g>
              );
            })}
            {/* Token */}
            <circle cx={tx} cy={ty} r={8} fill={C.ink} />
            {/* Edge label near the token */}
            <text
              x={tx}
              y={ty - 14}
              fill={C.ink}
              textAnchor="middle"
              className="font-mono"
              fontSize={10}
            >
              {edgeLabel[frame.edge]}
            </text>
          </svg>
        </div>

        {reduceMotion && (
          <div className="flex items-center gap-1 border-t-2 border-white px-3 py-2">
            <span className="font-mono text-[10px] text-zinc-500">STEP:</span>
            {(['render', 'message', 'new state'] as const).map((lbl, i) => (
              <button
                key={lbl}
                type="button"
                onClick={() => setT(LAP + i * EDGE_DUR + EDGE_DUR / 2)}
                className="border-2 border-white bg-black px-2 py-1 font-mono text-[10px] text-white hover:bg-zinc-900"
              >
                {lbl}
              </button>
            ))}
          </div>
        )}
      </section>
      <figcaption className="mt-2 text-center font-mono text-xs text-zinc-500">
        Model-View-Update — one state, a pure update function, a re-rendered
        view. Every message makes one full lap.
      </figcaption>
    </figure>
  );
}
