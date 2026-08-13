export type SectionType = 'top_shelf' | 'loop_track';

export interface Rack {
  id: string;
  name: string;
  section: SectionType;
  capacity: number;
  blocks: string[]; // Stack representation: bottom is index 0, top block is the last element (blocks[blocks.length - 1])
  iceLockedBy?: string; // ID of the adjacent bucket that must be emptied (0 blocks) to unfreeze
  ropeTiedTo?: string; // ID of the bucket/box that must be solved/cleared to untie rope
  allowedColors?: string[]; // Coloured bucket restriction: only these colors can be placed here
  coveredUntilColorStacked?: string; // Covered under colored shroud until that color is fully stacked/solved
  isConstruction?: boolean; // Under construction / mystery bucket
  targetColor?: string; // Revealed/target color for construction or single-color bucket
  adjacentIds?: string[]; // Spatial neighbors
}

export interface TargetBox {
  id: string;
  name: string;
  section: SectionType;
  color: string;
  capacity: number;
  filled: number;
  coveredUntilColorStacked?: string; // Covered under colored shroud until that color is stacked
  isConstruction?: boolean; // Scaffolding concealing color initially
  hiddenColor?: string;
  queueOrder?: number;
}

export interface LoopSortMap {
  name: string;
  level?: number;
  description?: string;
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
