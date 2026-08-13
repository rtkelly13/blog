import type { LoopSortMap, MoveStep, SolverResult } from './types';

interface InternalState {
  racks: Record<string, string[]>;
  boxes: Record<string, { filled: number; capacity: number; color: string }>;
  steps: MoveStep[];
}

function cloneMap(map: LoopSortMap): LoopSortMap {
  return {
    name: map.name,
    level: map.level,
    racks: map.racks.map((r) => ({
      ...r,
      blocks: [...r.blocks],
    })),
    boxes: map.boxes.map((b) => ({
      ...b,
    })),
  };
}

function getStateHash(state: InternalState): string {
  const boxHash = Object.entries(state.boxes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, b]) => `${id}:${b.filled}/${b.capacity}`)
    .join('|');

  const rackHash = Object.entries(state.racks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, blocks]) => `${id}:${blocks.join(',')}`)
    .join(';');

  return `${boxHash}#${rackHash}`;
}

function countContiguousTop(blocks: string[]): number {
  if (blocks.length === 0) return 0;
  const topColor = blocks[blocks.length - 1];
  let count = 0;
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i] === topColor) count++;
    else break;
  }
  return count;
}

function isSolved(state: InternalState): boolean {
  for (const box of Object.values(state.boxes)) {
    if (box.filled < box.capacity) return false;
  }
  return true;
}

function calculateHeuristic(state: InternalState): number {
  let remainingBoxCapacity = 0;
  for (const box of Object.values(state.boxes)) {
    remainingBoxCapacity += box.capacity - box.filled;
  }

  // Count how many colors are trapped under mismatched top blocks
  let trappedPenalty = 0;
  for (const blocks of Object.values(state.racks)) {
    if (blocks.length > 1) {
      const top = blocks[blocks.length - 1];
      for (let i = 0; i < blocks.length - 1; i++) {
        if (blocks[i] !== top) trappedPenalty++;
      }
    }
  }

  return remainingBoxCapacity * 10 + trappedPenalty;
}

/**
 * Solve a Loop Sort map using Priority Search.
 */
export function solveLoopSort(
  initialMap: LoopSortMap,
  maxStates: number = 40000,
): SolverResult {
  const startTime = performance.now();
  const mapCopy = cloneMap(initialMap);

  const initialRacks: Record<string, string[]> = {};
  for (const r of mapCopy.racks) {
    initialRacks[r.id] = [...r.blocks];
  }

  const initialBoxes: Record<
    string,
    { filled: number; capacity: number; color: string }
  > = {};
  for (const b of mapCopy.boxes) {
    initialBoxes[b.id] = {
      filled: b.filled,
      capacity: b.capacity,
      color: b.color,
    };
  }

  const startState: InternalState = {
    racks: initialRacks,
    boxes: initialBoxes,
    steps: [],
  };

  if (isSolved(startState)) {
    return {
      solved: true,
      steps: [],
      visitedStatesCount: 1,
      executionTimeMs: performance.now() - startTime,
    };
  }

  const queue: { state: InternalState; score: number }[] = [
    { state: startState, score: calculateHeuristic(startState) },
  ];

  const visited = new Set<string>();
  visited.add(getStateHash(startState));

  let visitedCount = 0;

  while (queue.length > 0) {
    // Sort queue by lowest score
    queue.sort((a, b) => a.score - b.score);
    const { state } = queue.shift()!;
    visitedCount++;

    if (visitedCount > maxStates) {
      return {
        solved: false,
        steps: [],
        visitedStatesCount: visitedCount,
        executionTimeMs: performance.now() - startTime,
        error: `Search limit reached (${maxStates} states explored).`,
      };
    }

    const lastStep = state.steps[state.steps.length - 1];

    // 1. FILL_BOX moves (highest priority)
    for (const [rackId, blocks] of Object.entries(state.racks)) {
      if (blocks.length === 0) continue;
      const topColor = blocks[blocks.length - 1];
      const contiguous = countContiguousTop(blocks);

      for (const [boxId, box] of Object.entries(state.boxes)) {
        if (box.color === topColor && box.filled < box.capacity) {
          const needed = box.capacity - box.filled;
          const transferCount = Math.min(contiguous, needed);

          const newRacks: Record<string, string[]> = {};
          for (const [k, v] of Object.entries(state.racks)) {
            newRacks[k] = [...v];
          }
          newRacks[rackId] = newRacks[rackId].slice(
            0,
            newRacks[rackId].length - transferCount,
          );

          const newBoxes: Record<
            string,
            { filled: number; capacity: number; color: string }
          > = {};
          for (const [k, v] of Object.entries(state.boxes)) {
            newBoxes[k] = { ...v };
          }
          newBoxes[boxId].filled += transferCount;

          const rackObj = mapCopy.racks.find((r) => r.id === rackId);
          const boxObj = mapCopy.boxes.find((b) => b.id === boxId);

          const nextSnapshot: LoopSortMap = {
            name: mapCopy.name,
            level: mapCopy.level,
            racks: mapCopy.racks.map((r) => ({
              ...r,
              blocks: newRacks[r.id] || [],
            })),
            boxes: mapCopy.boxes.map((b) => ({
              ...b,
              filled: newBoxes[b.id]?.filled ?? b.filled,
            })),
          };

          const step: MoveStep = {
            stepIndex: state.steps.length + 1,
            type: 'FILL_BOX',
            fromRackId: rackId,
            fromRackName: rackObj?.name || rackId,
            toTargetId: boxId,
            toTargetName: boxObj?.name || boxId,
            color: topColor,
            count: transferCount,
            description: `Deposit ${transferCount} ${topColor.toUpperCase()} block(s) into ${boxObj?.name || boxId}`,
            snapshot: nextSnapshot,
          };

          const nextState: InternalState = {
            racks: newRacks,
            boxes: newBoxes,
            steps: [...state.steps, step],
          };

          if (isSolved(nextState)) {
            return {
              solved: true,
              steps: nextState.steps,
              visitedStatesCount: visitedCount,
              executionTimeMs: performance.now() - startTime,
            };
          }

          const hash = getStateHash(nextState);
          if (!visited.has(hash)) {
            visited.add(hash);
            // Give fill box moves strong priority (lower score)
            const score =
              nextState.steps.length * 0.5 + calculateHeuristic(nextState);
            queue.push({ state: nextState, score });
          }
        }
      }
    }

    // 2. MOVE_STACK moves
    for (const [fromId, fromBlocks] of Object.entries(state.racks)) {
      if (fromBlocks.length === 0) continue;
      const topColor = fromBlocks[fromBlocks.length - 1];
      const contiguous = countContiguousTop(fromBlocks);
      const isPureStack = contiguous === fromBlocks.length;

      const rackFromObj = mapCopy.racks.find((r) => r.id === fromId);

      for (const [toId, toBlocks] of Object.entries(state.racks)) {
        if (fromId === toId) continue;

        // Prune immediate reverse cycle
        if (
          lastStep &&
          lastStep.type === 'MOVE_STACK' &&
          lastStep.fromRackId === toId &&
          lastStep.toTargetId === fromId
        ) {
          continue;
        }

        const rackToObj = mapCopy.racks.find((r) => r.id === toId);
        const capacityTo = rackToObj?.capacity || 4;
        const freeSpace = capacityTo - toBlocks.length;

        if (freeSpace <= 0) continue;

        const isToEmpty = toBlocks.length === 0;
        const toTopColor = isToEmpty ? null : toBlocks[toBlocks.length - 1];

        if (!isToEmpty && toTopColor !== topColor) continue;

        // Prune: don't move pure stack of X onto another stack of X without clearing the source
        if (!isToEmpty && isPureStack && fromBlocks.length > freeSpace) {
          continue;
        }

        const transferCount = Math.min(contiguous, freeSpace);

        const newRacks: Record<string, string[]> = {};
        for (const [k, v] of Object.entries(state.racks)) {
          newRacks[k] = [...v];
        }

        newRacks[fromId] = newRacks[fromId].slice(
          0,
          newRacks[fromId].length - transferCount,
        );
        for (let i = 0; i < transferCount; i++) {
          newRacks[toId].push(topColor);
        }

        const nextSnapshot: LoopSortMap = {
          name: mapCopy.name,
          level: mapCopy.level,
          racks: mapCopy.racks.map((r) => ({
            ...r,
            blocks: newRacks[r.id] || [],
          })),
          boxes: mapCopy.boxes.map((b) => ({
            ...b,
            filled: state.boxes[b.id]?.filled ?? b.filled,
          })),
        };

        const step: MoveStep = {
          stepIndex: state.steps.length + 1,
          type: 'MOVE_STACK',
          fromRackId: fromId,
          fromRackName: rackFromObj?.name || fromId,
          toTargetId: toId,
          toTargetName: rackToObj?.name || toId,
          color: topColor,
          count: transferCount,
          description: `Move ${transferCount} ${topColor.toUpperCase()} block(s) from ${rackFromObj?.name || fromId} to ${rackToObj?.name || toId}`,
          snapshot: nextSnapshot,
        };

        const nextState: InternalState = {
          racks: newRacks,
          boxes: { ...state.boxes },
          steps: [...state.steps, step],
        };

        const hash = getStateHash(nextState);
        if (!visited.has(hash)) {
          visited.add(hash);
          const score = nextState.steps.length + calculateHeuristic(nextState);
          queue.push({ state: nextState, score });
        }
      }
    }
  }

  return {
    solved: false,
    steps: [],
    visitedStatesCount: visitedCount,
    executionTimeMs: performance.now() - startTime,
    error: 'No solution found for this map layout.',
  };
}
