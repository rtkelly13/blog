/**
 * Configuration options for ASCII rendering
 */
export interface AsciiOptions {
  /** Horizontal spacing between nodes (default: 5) */
  paddingX?: number;
  /** Vertical spacing between nodes (default: 5) */
  paddingY?: number;
  /** Padding between text and node border (default: 1) */
  borderPadding?: number;
  /** Use only ASCII characters (+--| instead of ┌──┐) (default: false) */
  asciiOnly?: boolean;
  /** Show grid coordinates for debugging (default: false) */
  showCoords?: boolean;
}

/**
 * Box drawing characters for rendering
 */
export interface BoxChars {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  junction: string;
  arrowRight: string;
  arrowLeft: string;
  arrowUp: string;
  arrowDown: string;
  dottedHorizontal: string;
  dottedVertical: string;
}

/**
 * Node types supported by the renderer
 */
export type NodeShape =
  | 'rectangle'
  | 'circle'
  | 'diamond'
  | 'hexagon'
  | 'rounded';

/**
 * Edge types supported by the renderer
 */
export type EdgeType = 'solid' | 'dotted' | 'thick';

/**
 * Diagram types supported
 */
export type DiagramType = 'flowchart' | 'sequence' | 'unsupported';

/**
 * Parsed node in the diagram
 */
export interface Node {
  id: string;
  label: string;
  shape: NodeShape;
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
}

/**
 * Parsed edge in the diagram
 */
export interface Edge {
  from: string;
  to: string;
  label?: string;
  type: EdgeType;
}

/**
 * Participant in a sequence diagram
 */
export interface Participant {
  id: string;
  label: string;
  alias?: string;
}

/**
 * Message in a sequence diagram
 */
export interface Message {
  from: string;
  to: string;
  label: string;
  type: 'solid' | 'dotted';
  activation?: boolean;
}

/**
 * Parsed flowchart structure
 */
export interface FlowchartDiagram {
  type: 'flowchart';
  direction: 'LR' | 'RL' | 'TD' | 'BT';
  nodes: Node[];
  edges: Edge[];
}

/**
 * Parsed sequence diagram structure
 */
export interface SequenceDiagram {
  type: 'sequence';
  participants: Participant[];
  messages: Message[];
}

/**
 * Generic parsed diagram
 */
export type ParsedDiagram = FlowchartDiagram | SequenceDiagram;

/**
 * Grid coordinate for layout
 */
export interface GridCoord {
  x: number;
  y: number;
}

/**
 * Grid cell content
 */
export type GridCell = string | null;

/**
 * Render result
 */
export interface RenderResult {
  ascii: string;
  width: number;
  height: number;
  error?: string;
}
