import dynamic from 'next/dynamic';
import type { DiagramProps } from './types';

// Dynamic imports for client-side only rendering
const MermaidDiagram = dynamic(() => import('./MermaidDiagram'), {
  ssr: false,
  loading: () => <DiagramSkeleton />,
});

const SvgDiagram = dynamic(() => import('./SvgDiagram'), {
  ssr: false,
  loading: () => <DiagramSkeleton />,
});

const ReactFlowDiagram = dynamic(() => import('./ReactFlowDiagram'), {
  ssr: false,
  loading: () => <DiagramSkeleton />,
});

/**
 * Loading skeleton for diagrams
 */
function DiagramSkeleton() {
  return (
    <div className="flex items-center justify-center w-full h-48 my-4 bg-zinc-900 border-2 border-white animate-pulse">
      <span className="text-zinc-500 font-mono">LOADING_DIAGRAM...</span>
    </div>
  );
}

/**
 * Figure wrapper with optional caption
 */
function DiagramWrapper({
  children,
  caption,
  className = '',
}: {
  children: React.ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <figure className={`my-6 ${className}`}>
      <div className="flex justify-center w-full overflow-x-auto border-2 border-white bg-zinc-900 p-4">
        {children}
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-zinc-400 font-mono">
          {`// ${caption}`}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Universal Diagram component that routes to specific renderers
 *
 * @example
 * // Mermaid diagram
 * <Diagram type="mermaid" caption="Data Flow">
 *   graph LR
 *     A[Input] --> B[Process] --> C[Output]
 * </Diagram>
 *
 * @example
 * // SVG diagram
 * <Diagram type="svg" src="/static/diagrams/flow.svg" caption="Architecture" />
 *
 * @example
 * // React Flow diagram
 * <Diagram
 *   type="reactflow"
 *   nodes={[{ id: '1', label: 'Node 1' }]}
 *   edges={[{ id: 'e1', source: '1', target: '2' }]}
 * />
 */
export default function Diagram(props: DiagramProps) {
  const { type, caption, className } = props;

  let content: React.ReactNode;

  switch (type) {
    case 'mermaid':
      content = <MermaidDiagram {...props} />;
      break;
    case 'svg':
      content = <SvgDiagram {...props} />;
      break;
    case 'reactflow':
      content = <ReactFlowDiagram {...props} />;
      break;
    default:
      content = (
        <div className="p-4 text-brutalist-pink bg-zinc-900 border-2 border-brutalist-pink font-mono">
          ERROR: Unknown diagram type: {(props as any).type}
        </div>
      );
  }

  return (
    <DiagramWrapper caption={caption} className={className}>
      {content}
    </DiagramWrapper>
  );
}
