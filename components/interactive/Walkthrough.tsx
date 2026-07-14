import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import '@xyflow/react/dist/style.css';

type Accent = 'cyan' | 'pink' | 'yellow' | 'white';

export interface WalkthroughNodeSpec {
  id: string;
  label: string;
  /** Small secondary line under the label. */
  detail?: string;
  x: number;
  y: number;
  accent?: Accent;
}

export interface WalkthroughEdgeSpec {
  from: string;
  to: string;
}

export interface WalkthroughStep {
  title: string;
  caption: string;
  /** Node ids emphasised (and fitted into view) on this step. */
  focus: string[];
  /** Edges lit on this step, as "from->to". */
  activeEdges?: string[];
}

interface WalkthroughProps {
  nodes: WalkthroughNodeSpec[];
  edges: WalkthroughEdgeSpec[];
  steps: WalkthroughStep[];
  /** Canvas height in px (default 360). */
  height?: number;
  title?: string;
}

const ACCENTS: Record<
  Accent,
  { border: string; fill: string; text: string; hex: string }
> = {
  cyan: {
    border: 'border-brutalist-cyan',
    fill: 'bg-brutalist-cyan',
    text: 'text-brutalist-cyan',
    hex: '#22d3ee',
  },
  pink: {
    border: 'border-brutalist-pink',
    fill: 'bg-brutalist-pink',
    text: 'text-brutalist-pink',
    hex: '#ec4899',
  },
  yellow: {
    border: 'border-brutalist-yellow',
    fill: 'bg-brutalist-yellow',
    text: 'text-brutalist-yellow',
    hex: '#facc15',
  },
  white: {
    border: 'border-white',
    fill: 'bg-white',
    text: 'text-white',
    hex: '#ffffff',
  },
};

type StepNode = Node<{
  label: string;
  detail?: string;
  accent: Accent;
  active: boolean;
}>;

/**
 * A node in the map. Inactive: a crisp dark card with a thin accent rail on the
 * left, so its identity reads without washing the whole box out. Active: the
 * accent floods the card, black text, a hard offset shadow and a slight lift —
 * the same high-contrast "this is the thing" treatment the Terminal uses for
 * its highlighted line.
 */
function BrutalistNode({ data }: NodeProps<StepNode>) {
  const accent = ACCENTS[data.accent];
  return (
    <div
      className={`relative min-w-[9.5rem] overflow-hidden border-2 py-2 pr-3 pl-3.5 font-mono transition-all duration-300 ${
        data.active
          ? `${accent.border} ${accent.fill} -translate-y-0.5 text-black shadow-hard-md`
          : 'border-zinc-700 bg-black text-zinc-400'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {/* left accent rail — the node's colour identity even when inactive */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${accent.fill} ${data.active ? 'opacity-0' : 'opacity-100'}`}
      />
      <p
        className={`text-xs font-bold uppercase tracking-wide ${data.active ? 'text-black' : 'text-white'}`}
      >
        {data.label}
      </p>
      {data.detail && (
        <p
          className={`mt-0.5 text-[10px] leading-tight ${data.active ? 'text-black/70' : 'text-zinc-500'}`}
        >
          {data.detail}
        </p>
      )}
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { brutalist: BrutalistNode };
const noop = () => {};

function WalkthroughCanvas({
  nodes,
  edges,
  steps,
  height = 360,
  title,
}: WalkthroughProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const reduceMotion = useReducedMotion();

  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const flowNodes = useMemo<StepNode[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: 'brutalist',
        position: { x: node.x, y: node.y },
        data: {
          label: node.label,
          detail: node.detail,
          accent: node.accent ?? 'white',
          active: step.focus.includes(node.id),
        },
        draggable: false,
        connectable: false,
        selectable: false,
      })),
    [nodes, step],
  );

  const flowEdges = useMemo(
    () =>
      edges.map((edge) => {
        const id = `${edge.from}->${edge.to}`;
        const active = step.activeEdges?.includes(id) ?? false;
        const stroke = active ? '#22d3ee' : '#3f3f46';
        return {
          id,
          source: edge.from,
          target: edge.to,
          type: 'smoothstep',
          animated: active && !reduceMotion,
          style: { stroke, strokeWidth: active ? 2.5 : 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 16,
            height: 16,
            color: stroke,
          },
        };
      }),
    [edges, step, reduceMotion],
  );

  useEffect(() => {
    if (!nodesInitialized) return;
    void fitView({
      nodes: step.focus.map((id) => ({ id })),
      padding: 0.3,
      maxZoom: 1.5,
      duration: reduceMotion ? 0 : 600,
    });
  }, [nodesInitialized, step, fitView, reduceMotion]);

  return (
    <section
      className="not-prose my-6 border-2 border-white bg-black font-mono"
      aria-label={title ?? 'Walkthrough'}
    >
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-white bg-zinc-900 px-4 py-2">
        <p className="text-xs font-bold uppercase tracking-widest text-brutalist-yellow">
          [ {title ?? 'walkthrough'} ]
        </p>
        <p className="text-xs text-zinc-400 tabular-nums">
          step {stepIndex + 1} / {steps.length}
        </p>
      </div>

      <div style={{ height }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          onNodesChange={noop}
          onEdgesChange={noop}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          preventScrolling={false}
          minZoom={0.3}
          colorMode="dark"
        >
          <Background
            variant={BackgroundVariant.Cross}
            gap={28}
            size={4}
            color="#1c1c22"
          />
        </ReactFlow>
      </div>

      <div className="border-t-2 border-white bg-zinc-900 px-4 py-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="min-h-[3.5rem]"
          >
            <h3 className="text-sm font-bold uppercase text-brutalist-cyan">
              {step.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-zinc-200">
              {step.caption}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="border-2 border-white px-3 py-1 text-xs font-bold uppercase text-white transition-colors enabled:hover:bg-white enabled:hover:text-black disabled:opacity-30"
          >
            &lt; back
          </button>
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                aria-current={i === stepIndex}
                onClick={() => setStepIndex(i)}
                className={`h-3 w-3 border-2 border-white transition-colors ${
                  i === stepIndex
                    ? 'bg-brutalist-yellow'
                    : 'bg-transparent hover:bg-zinc-600'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setStepIndex((i) => Math.min(steps.length - 1, i + 1))
            }
            disabled={stepIndex === steps.length - 1}
            className="border-2 border-white px-3 py-1 text-xs font-bold uppercase text-white transition-colors enabled:hover:bg-white enabled:hover:text-black disabled:opacity-30"
          >
            next &gt;
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * A guided, step-through node-graph walkthrough for MDX. Navigation is entirely
 * step-driven (no free pan/zoom), so it never hijacks page scrolling; each step
 * highlights part of the graph, animates the active edges, and pans the camera
 * to the focused nodes. Loaded via next/dynamic in MDXComponents so pages that
 * don't use it ship none of @xyflow/react.
 */
export default function Walkthrough(props: WalkthroughProps) {
  if (props.steps.length === 0 || props.nodes.length === 0) return null;
  return (
    <ReactFlowProvider>
      <WalkthroughCanvas {...props} />
    </ReactFlowProvider>
  );
}
