import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  fileTreeRows,
  ignoreRule,
  type RenderNode,
  type Trust,
  type View,
} from './fileTreeModel';

interface FileTreeProps {
  title?: string;
}

const TRUST_DOT: Record<Trust, string> = {
  brain: 'bg-brutalist-cyan',
  trusted: 'bg-brutalist-pink',
  untrusted: 'bg-brutalist-cyberOrange',
};

function Row({
  node,
  reduceMotion,
}: {
  node: RenderNode;
  reduceMotion: boolean;
}) {
  const indent = node.depth * 1.5;
  const isSymlink = node.kind === 'symlink';

  const labelClass = node.lit
    ? 'bg-brutalist-cyan px-1 font-bold text-black'
    : node.dimmed
      ? 'text-zinc-600'
      : isSymlink
        ? 'text-brutalist-yellow'
        : node.kind === 'dir'
          ? 'text-white'
          : 'text-zinc-300';

  return (
    <motion.div
      layout={!reduceMotion}
      initial={
        node.body ? { opacity: 0, x: reduceMotion ? 0 : -12 } : { opacity: 1 }
      }
      animate={{ opacity: node.dimmed ? 0.5 : 1, x: 0 }}
      exit={{ opacity: 0, x: reduceMotion ? 0 : -12 }}
      transition={{ duration: reduceMotion ? 0 : 0.3 }}
      className="flex items-center gap-2 whitespace-nowrap py-0.5 text-xs"
      style={{ paddingLeft: `${indent}rem` }}
    >
      <span className="text-zinc-600">{node.depth > 0 ? '├─' : ''}</span>
      {node.trust && (
        <span
          aria-hidden
          className={`inline-block h-2 w-2 shrink-0 ${TRUST_DOT[node.trust]}`}
        />
      )}
      <span className={labelClass}>{node.label}</span>
      {node.note && <span className="text-zinc-600">— {node.note}</span>}
      {node.tag && (
        <span
          className={`ml-1 border px-1 text-[10px] uppercase ${
            node.tag.startsWith('!')
              ? 'border-brutalist-cyan text-brutalist-cyan'
              : 'border-zinc-600 text-zinc-500'
          }`}
        >
          {node.tag}
        </span>
      )}
    </motion.div>
  );
}

/**
 * Interactive filesystem view of the virtual monorepo: wire the
 * `projects → ../company` symlink and watch the body repos mirror into the
 * brain, then toggle between git's view (body ignored) and the agent's view
 * (body traversable) — the "two ignore files, opposite views of one path"
 * trick, animated. Loaded via next/dynamic in MDXComponents so pages that
 * don't use it ship none of it.
 */
export default function FileTree({ title }: FileTreeProps) {
  const [linked, setLinked] = useState(false);
  const [view, setView] = useState<View>('git');
  const reduceMotion = useReducedMotion();

  const rows = useMemo(() => fileTreeRows({ linked, view }), [linked, view]);
  const rule = ignoreRule(view);

  return (
    <section
      className="not-prose my-6 border-2 border-white bg-black font-mono"
      aria-label={title ?? 'Virtual monorepo file tree'}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-white bg-zinc-900 px-4 py-2">
        <p className="text-xs font-bold uppercase tracking-widest text-brutalist-yellow">
          [ {title ?? 'the trick, on disk'} ]
        </p>
        <div className="flex items-center gap-2">
          {linked && (
            <div className="flex overflow-hidden border-2 border-zinc-600">
              {(['git', 'agent'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={`px-2 py-0.5 text-xs font-bold uppercase transition-colors ${
                    view === v
                      ? 'bg-brutalist-cyan text-black'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {v} view
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setLinked((l) => !l)}
            className="border-2 border-white px-2 py-0.5 text-xs font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            {linked ? 'unlink' : 'wire the symlink'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto px-4 py-3">
        <AnimatePresence initial={false}>
          {rows.map((node) => (
            <Row key={node.id} node={node} reduceMotion={!!reduceMotion} />
          ))}
        </AnimatePresence>
      </div>

      <div className="border-t-2 border-white bg-zinc-900 px-4 py-2 text-xs">
        {!linked ? (
          <p className="text-zinc-400">
            Two roots, no link yet. <span className="text-white">company/</span>{' '}
            is the body (real git repos);{' '}
            <span className="text-brutalist-cyan">workspace/</span> is the
            brain. Wire the symlink to bring the body into the brain’s tree.
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-x-2 text-zinc-300">
            <span className="uppercase text-brutalist-yellow">
              {rule.file}:
            </span>
            <span
              className={
                rule.sense === 'allow' ? 'text-brutalist-cyan' : 'text-zinc-500'
              }
            >
              {rule.rule}
            </span>
            <span className="text-zinc-500">
              {view === 'git'
                ? '— git never sees the body (nor the symlink); the bootstrap script recreates it per machine.'
                : '— the agent is explicitly allowed to traverse the body: one filesystem root, one permission grant.'}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
