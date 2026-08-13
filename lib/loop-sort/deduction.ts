import type { LoopSortMap } from './types';

export interface ColorDeficitAnalysis {
  demanded: Record<string, number>;
  exposed: Record<string, number>;
  deficit: Record<string, number>;
  totalMysterySlots: number;
  totalDeficitCount: number;
  canExactFill: boolean;
}

/**
 * Analyze the color demand vs visible/exposed blocks to determine
 * missing colors for fog-of-war mystery slots.
 */
export function analyzeColorDeficit(map: LoopSortMap): ColorDeficitAnalysis {
  const demanded: Record<string, number> = {};
  const exposed: Record<string, number> = {};
  const deficit: Record<string, number> = {};

  // 1. Calculate demand from target boxes
  for (const box of map.boxes) {
    if (box.color && box.color !== '?') {
      const remaining = Math.max(0, box.capacity - box.filled);
      demanded[box.color] = (demanded[box.color] || 0) + remaining;
    }
  }

  let totalMysterySlots = 0;

  // 2. Count exposed blocks and mystery slots
  for (const rack of map.racks) {
    for (const block of rack.blocks) {
      if (block === '?' || block === 'hidden' || block === 'mystery') {
        totalMysterySlots++;
      } else if (block) {
        exposed[block] = (exposed[block] || 0) + 1;
      }
    }
  }

  // 3. Compute deficit = Demand - Exposed
  let totalDeficitCount = 0;
  for (const [color, count] of Object.entries(demanded)) {
    const exp = exposed[color] || 0;
    const diff = Math.max(0, count - exp);
    if (diff > 0) {
      deficit[color] = diff;
      totalDeficitCount += diff;
    }
  }

  return {
    demanded,
    exposed,
    deficit,
    totalMysterySlots,
    totalDeficitCount,
    canExactFill: totalMysterySlots === totalDeficitCount,
  };
}

/**
 * Heuristic "Best Guess" Auto-fill: Populates '?' slots using the computed color deficits
 * while respecting rack capacity limits.
 */
export function autoFillBestGuess(map: LoopSortMap): LoopSortMap {
  const analysis = analyzeColorDeficit(map);
  const pool: string[] = [];

  // Populate pool from deficits
  for (const [color, count] of Object.entries(analysis.deficit)) {
    for (let i = 0; i < count; i++) {
      pool.push(color);
    }
  }

  // If deficit is less than mystery slots, fill remainder with most demanded or neutral color
  while (pool.length < analysis.totalMysterySlots) {
    const fallbackColor = Object.keys(analysis.demanded)[0] || 'grey';
    pool.push(fallbackColor);
  }

  let poolIdx = 0;

  return {
    ...map,
    racks: map.racks.map((rack) => {
      const newBlocks = rack.blocks.map((block) => {
        if (block === '?' || block === 'hidden' || block === 'mystery') {
          if (poolIdx < pool.length) {
            const filledColor = pool[poolIdx++];
            return filledColor;
          }
        }
        return block;
      });

      return {
        ...rack,
        blocks: newBlocks,
      };
    }),
  };
}
