export type SectionType = 'top_shelf' | 'loop_track';

export interface Rack {
  id: string;
  name: string;
  section: SectionType;
  capacity: number;
  blocks: string[]; // Stack representation: top block is the last element (blocks[blocks.length - 1])
}

export interface TargetBox {
  id: string;
  name: string;
  section: SectionType;
  color: string;
  capacity: number;
  filled: number;
}

export interface LoopSortMap {
  name: string;
  level?: number;
  racks: Rack[];
  boxes: TargetBox[];
}

export interface MoveStep {
  stepIndex: number;
  type: 'FILL_BOX' | 'MOVE_STACK';
  fromRackId: string;
  fromRackName: string;
  toTargetId: string;
  toTargetName: string;
  color: string;
  count: number;
  description: string;
  snapshot: LoopSortMap;
}

export interface SolverResult {
  solved: boolean;
  steps: MoveStep[];
  visitedStatesCount: number;
  executionTimeMs: number;
  error?: string;
}
