import { describe, expect, it } from 'vitest';
import { parseMapText, stringifyMap } from '../lib/loop-sort/parser';
import {
  LEVEL_1_WARMUP,
  LEVEL_259_EXPOSED,
  shuffleMapColors,
} from '../lib/loop-sort/presets';
import { solveLoopSort } from '../lib/loop-sort/solver';

describe('Loop Sort Parser & Serializer', () => {
  it('should parse structured text map definition correctly', () => {
    const text = `
# Loop Sort Level 259 Test
NAME: Level 259 Test
LEVEL: 259

T1: brown, grey, grey, brown
T2: red, pink, grey, red
BOX_TOP: pink (4)

L1: orange, green, green, green
BOX_L1: pink (4)
BOX_L2: red (4)
`;

    const map = parseMapText(text);
    expect(map.name).toBe('Level 259 Test');
    expect(map.level).toBe(259);
    expect(map.racks.length).toBe(3); // T1, T2, L1
    expect(map.boxes.length).toBe(3); // BOX_TOP, BOX_L1, BOX_L2
    expect(map.racks[0].blocks).toEqual(['brown', 'grey', 'grey', 'brown']);
    expect(map.boxes[0].color).toBe('pink');
  });

  it('should round-trip stringifyMap and parseMapText', () => {
    const serialized = stringifyMap(LEVEL_259_EXPOSED);
    const parsed = parseMapText(serialized);
    expect(parsed.racks.length).toBe(LEVEL_259_EXPOSED.racks.length);
    expect(parsed.boxes.length).toBe(LEVEL_259_EXPOSED.boxes.length);
  });
});

describe('Loop Sort Solver Engine', () => {
  it('should solve LEVEL_1_WARMUP cleanly', () => {
    const result = solveLoopSort(LEVEL_1_WARMUP);
    expect(result.solved).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it('should solve LEVEL_259_EXPOSED map', () => {
    const result = solveLoopSort(LEVEL_259_EXPOSED, 50000);
    expect(result.solved).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('should permit color shuffling while preserving map structure', () => {
    const recolored = shuffleMapColors(LEVEL_1_WARMUP);
    expect(recolored.racks.length).toBe(LEVEL_1_WARMUP.racks.length);
    expect(recolored.boxes.length).toBe(LEVEL_1_WARMUP.boxes.length);
    const result = solveLoopSort(recolored);
    expect(result.solved).toBe(true);
  });
});
