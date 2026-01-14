import type { ReactFlowDiagramProps } from './types';

/**
 * React Flow diagram renderer (stub implementation)
 *
 * This is a placeholder for future implementation.
 * To implement:
 * 1. Install: pnpm add @xyflow/react
 * 2. Replace this stub with actual ReactFlow implementation
 *
 * @example
 * <Diagram
 *   type="reactflow"
 *   nodes={[
 *     { id: '1', label: 'Input', type: 'input' },
 *     { id: '2', label: 'Process' },
 *     { id: '3', label: 'Output', type: 'output' },
 *   ]}
 *   edges={[
 *     { id: 'e1-2', source: '1', target: '2' },
 *     { id: 'e2-3', source: '2', target: '3' },
 *   ]}
 * />
 */
export default function ReactFlowDiagram({
  nodes,
  edges,
}: ReactFlowDiagramProps) {
  return (
    <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">
          React Flow Diagram (Not Yet Implemented)
        </span>
      </div>
      <p className="text-sm text-amber-600 dark:text-amber-300 mb-4">
        This diagram type requires the @xyflow/react package. Install it to
        enable interactive node-based diagrams.
      </p>
      <div className="text-xs font-mono bg-amber-100 dark:bg-amber-900/40 p-3 rounded overflow-x-auto">
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Configuration preview:
        </p>
        <pre className="text-amber-800 dark:text-amber-200">
          {JSON.stringify({ nodes, edges }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
