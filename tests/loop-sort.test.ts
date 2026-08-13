import { describe, expect, it } from 'vitest';
import {
  normalizeColor,
  parseMapText,
  stringifyMap,
} from '../lib/loop-sort/parser';
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

  it('should parse documented game mechanics modifiers (ice, rope, color filter, construction, mystery blocks)', () => {
    const text = `
NAME: Advanced Mechanics Level
LEVEL: 300

[TOP_SHELF]
T1: empty { adjacent_to: [T2] }
T2: red, pink, pink { ice_locked_by: T1 }
T3: yellow, yellow { rope_tied_to: T4 }
T4: pink, orange, pink
T5: orange, purple, orange { allowed_colors: [orange, purple] }
    // BOX_TOP pink with covered_color pink
    BOX_TOP: pink (4) { covered_color: pink }

    [LOOP_TRACK]
    L1: orange, green, green
    L2: blue, grey, brown { ice_locked_by: L1 }
    L3: yellow, yellow, purple
    L4: ?, ?, magenta, magenta { construction: true, target_color: magenta }
    L5: green, red, red, magenta { covered_color: red }
    BOX_L1: red (4)
    BOX_L2: magenta (4) { covered_color: red }
    BOX_L3: yellow (4) { construction: true, hidden_color: yellow, queue_order: 2 }
    `;

    const map = parseMapText(text);
    expect(map.name).toBe('Advanced Mechanics Level');
    expect(map.level).toBe(300);

    // BOX_TOP covered color
    const boxTop = map.boxes.find((b) => b.id === 'BOX_TOP');
    expect(boxTop?.coveredUntilColorStacked).toBe('pink');

    // L5 covered color
    const l5 = map.racks.find((r) => r.id === 'L5');
    expect(l5?.coveredUntilColorStacked).toBe('red');

    // BOX_L2 covered color
    const boxL2 = map.boxes.find((b) => b.id === 'BOX_L2');
    expect(boxL2?.coveredUntilColorStacked).toBe('red');

    // T1 empty
    const t1 = map.racks.find((r) => r.id === 'T1');
    expect(t1?.blocks).toEqual([]);
    expect(t1?.adjacentIds).toEqual(['T2']);

    // T2 ice locked by T1
    const t2 = map.racks.find((r) => r.id === 'T2');
    expect(t2?.iceLockedBy).toBe('T1');

    // T3 rope tied to T4
    const t3 = map.racks.find((r) => r.id === 'T3');
    expect(t3?.ropeTiedTo).toBe('T4');

    // T5 allowed colors
    const t5 = map.racks.find((r) => r.id === 'T5');
    expect(t5?.allowedColors).toEqual(['orange', 'purple']);

    // L4 mystery blocks & construction
    const l4 = map.racks.find((r) => r.id === 'L4');
    expect(l4?.blocks).toEqual(['?', '?', 'magenta', 'magenta']);
    expect(l4?.isConstruction).toBe(true);
    expect(l4?.targetColor).toBe('magenta');

    // BOX_L3 construction & queue
    const boxL3 = map.boxes.find((b) => b.id === 'BOX_L3');
    expect(boxL3?.isConstruction).toBe(true);
    expect(boxL3?.hiddenColor).toBe('yellow');
    expect(boxL3?.queueOrder).toBe(2);
  });

  it('should round-trip stringifyMap and parseMapText with mechanics preserved', () => {
    const originalText = `NAME: Round Trip Level
LEVEL: 400

# Upper Shelf Racks
T1: red, pink { ice_locked_by: T2 }
T2: empty { allowed_colors: [red] }

# Upper Shelf Target Boxes
BOX_TOP: pink (4)

# Conveyor Loop Track Racks
L1: ?, green { construction: true }

# Conveyor Loop Target Boxes
BOX_L1: red (4) { construction: true, queue_order: 1 }`;

    const parsed = parseMapText(originalText);
    const serialized = stringifyMap(parsed);
    const reParsed = parseMapText(serialized);

    expect(reParsed.racks[0].iceLockedBy).toBe('T2');
    expect(reParsed.racks[1].allowedColors).toEqual(['red']);
    expect(reParsed.racks[2].isConstruction).toBe(true);
    expect(reParsed.racks[2].blocks).toEqual(['?', 'green']);
    expect(reParsed.boxes[1].isConstruction).toBe(true);
    expect(reParsed.boxes[1].queueOrder).toBe(1);
  });

  it('should parse JSON representation containing full mechanics', () => {
    const jsonStr = JSON.stringify({
      name: 'JSON Level',
      level: 42,
      racks: [
        {
          id: 'T1',
          section: 'top_shelf',
          capacity: 4,
          blocks: ['red', 'blue'],
          iceLockedBy: 'T2',
          allowedColors: ['red', 'blue'],
          isConstruction: false,
        },
      ],
      boxes: [
        {
          id: 'B1',
          section: 'loop_track',
          color: 'blue',
          capacity: 4,
          filled: 0,
          isConstruction: true,
          queueOrder: 1,
        },
      ],
    });

    const map = parseMapText(jsonStr);
    expect(map.name).toBe('JSON Level');
    expect(map.level).toBe(42);
    expect(map.racks[0].iceLockedBy).toBe('T2');
    expect(map.racks[0].allowedColors).toEqual(['red', 'blue']);
    expect(map.boxes[0].isConstruction).toBe(true);
    expect(map.boxes[0].queueOrder).toBe(1);
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
