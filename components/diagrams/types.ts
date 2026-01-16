/**
 * Supported diagram renderer types
 */
export type DiagramType = 'mermaid' | 'svg' | 'reactflow';

/**
 * Base props shared by all diagram renderers
 */
export interface BaseDiagramProps {
  /** Optional caption displayed below the diagram */
  caption?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for Mermaid diagrams (text-based definition)
 */
export interface MermaidDiagramProps extends BaseDiagramProps {
  type: 'mermaid';
  /** Mermaid diagram definition as children */
  children: string;
  src?: never;
  nodes?: never;
  edges?: never;
}

/**
 * Props for SVG diagrams (file-based)
 */
export interface SvgDiagramProps extends BaseDiagramProps {
  type: 'svg';
  /** Path to SVG file */
  src: string;
  /** Optional dark mode SVG source */
  darkSrc?: string;
  children?: never;
  nodes?: never;
  edges?: never;
}

/**
 * Node definition for React Flow diagrams
 */
export interface FlowNode {
  id: string;
  label: string;
  type?: 'default' | 'input' | 'output';
  position?: { x: number; y: number };
  style?: {
    background?: string;
    border?: string;
  };
}

/**
 * Edge definition for React Flow diagrams
 */
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

/**
 * Props for React Flow diagrams (node-based)
 */
export interface ReactFlowDiagramProps extends BaseDiagramProps {
  type: 'reactflow';
  /** Node definitions */
  nodes: FlowNode[];
  /** Edge definitions */
  edges: FlowEdge[];
  children?: never;
  src?: never;
}

/**
 * Union type for all diagram props
 */
export type DiagramProps =
  | MermaidDiagramProps
  | SvgDiagramProps
  | ReactFlowDiagramProps;
