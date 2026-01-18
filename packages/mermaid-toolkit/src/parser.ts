import type {
  Edge,
  FlowchartDiagram,
  Node,
  ParsedDiagram,
  SequenceDiagram,
} from './types';

export function detectDiagramType(code: string): string | null {
  const trimmed = code.trim();

  if (trimmed.startsWith('graph ') || trimmed.startsWith('flowchart ')) {
    return 'flowchart';
  }

  if (trimmed.startsWith('sequenceDiagram')) {
    return 'sequence';
  }

  return null;
}

export function parseFlowchart(code: string): FlowchartDiagram {
  const lines = code.trim().split('\n');
  const firstLine = lines[0];

  const directionMatch = firstLine.match(/(?:graph|flowchart)\s+(LR|RL|TD|BT)/);
  const direction = (directionMatch?.[1] || 'LR') as 'LR' | 'RL' | 'TD' | 'BT';

  const nodes = new Map<string, Node>();
  const edges: Edge[] = [];

  for (const line of lines.slice(1)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('%%')) {
      continue;
    }

    parseFlowchartLine(trimmedLine, nodes, edges);
  }

  return {
    type: 'flowchart',
    direction,
    nodes: Array.from(nodes.values()),
    edges,
  };
}

function parseFlowchartLine(
  line: string,
  nodes: Map<string, Node>,
  edges: Edge[],
): void {
  const edgeRegex =
    /(\w+)(?:\[([^\]]+)\])?\s*(-->|---|-\.-|==>)\s*(?:\|([^|]+)\|)?\s*(\w+)(?:\[([^\]]+)\])?/;
  const match = line.match(edgeRegex);

  if (match) {
    const [, fromId, fromLabel, edgeType, edgeLabel, toId, toLabel] = match;

    if (!nodes.has(fromId)) {
      nodes.set(fromId, createNode(fromId, fromLabel || fromId));
    }

    if (!nodes.has(toId)) {
      nodes.set(toId, createNode(toId, toLabel || toId));
    }

    edges.push({
      from: fromId,
      to: toId,
      label: edgeLabel,
      type:
        edgeType === '-.-' ? 'dotted' : edgeType === '==>' ? 'thick' : 'solid',
    });
  } else {
    const nodeRegex = /(\w+)\[([^\]]+)\]/;
    const nodeMatch = line.match(nodeRegex);

    if (nodeMatch) {
      const [, id, label] = nodeMatch;
      if (!nodes.has(id)) {
        nodes.set(id, createNode(id, label));
      }
    }
  }
}

function createNode(id: string, label: string): Node {
  return {
    id,
    label,
    shape: 'rectangle',
  };
}

export function parseSequenceDiagram(code: string): SequenceDiagram {
  const lines = code.trim().split('\n');
  const participants = new Map<
    string,
    { id: string; label: string; alias?: string }
  >();
  const messages: SequenceDiagram['messages'] = [];

  for (const line of lines.slice(1)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('%%')) {
      continue;
    }

    const participantRegex = /participant\s+(\w+)(?:\s+as\s+(.+))?/;
    const partMatch = trimmedLine.match(participantRegex);

    if (partMatch) {
      const [, id, alias] = partMatch;
      participants.set(id, { id, label: alias || id, alias });
      continue;
    }

    const messageRegex = /(\w+)\s*(--?>>?)\s*(\w+):\s*(.+)/;
    const msgMatch = trimmedLine.match(messageRegex);

    if (msgMatch) {
      const [, from, arrow, to, label] = msgMatch;

      if (!participants.has(from)) {
        participants.set(from, { id: from, label: from });
      }
      if (!participants.has(to)) {
        participants.set(to, { id: to, label: to });
      }

      messages.push({
        from,
        to,
        label,
        type: arrow.includes('--') ? 'dotted' : 'solid',
      });
    }
  }

  return {
    type: 'sequence',
    participants: Array.from(participants.values()),
    messages,
  };
}

export function parseMermaid(code: string): ParsedDiagram | null {
  const diagramType = detectDiagramType(code);

  if (!diagramType) {
    return null;
  }

  switch (diagramType) {
    case 'flowchart':
      return parseFlowchart(code);
    case 'sequence':
      return parseSequenceDiagram(code);
    default:
      return null;
  }
}
