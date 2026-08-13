import type { LoopSortMap } from './types';

export const LEVEL_259_EXPOSED: LoopSortMap = {
  name: 'Level 259 (Super Hard - Fully Exposed)',
  level: 259,
  description:
    'Fully exposed multi-tier level with 5 top shelf racks and 5 conveyor loop racks.',
  racks: [
    // Top Shelf Racks (Capacity 4)
    {
      id: 'T1',
      name: 'Top Shelf 1',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['brown', 'grey', 'brown'],
    },
    {
      id: 'T2',
      name: 'Top Shelf 2',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['red', 'pink', 'pink'],
    },
    {
      id: 'T3',
      name: 'Top Shelf 3',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['yellow', 'yellow'],
    },
    {
      id: 'T4',
      name: 'Top Shelf 4',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['pink', 'orange', 'pink'],
    },
    {
      id: 'T5',
      name: 'Top Shelf 5',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['orange', 'purple', 'orange'],
    },

    // Loop Track Racks (Capacity 4)
    {
      id: 'L1',
      name: 'Track Rack A',
      section: 'loop_track',
      capacity: 4,
      blocks: ['orange', 'green', 'green'],
    },
    {
      id: 'L2',
      name: 'Track Rack B',
      section: 'loop_track',
      capacity: 4,
      blocks: ['blue', 'grey', 'brown'],
    },
    {
      id: 'L3',
      name: 'Track Rack C',
      section: 'loop_track',
      capacity: 4,
      blocks: ['yellow', 'yellow', 'purple'],
    },
    {
      id: 'L4',
      name: 'Track Rack D',
      section: 'loop_track',
      capacity: 4,
      blocks: ['magenta', 'red', 'magenta', 'magenta'],
    },
    {
      id: 'L5',
      name: 'Track Rack E (Bottom)',
      section: 'loop_track',
      capacity: 4,
      blocks: ['green', 'red', 'red', 'magenta'],
    },
  ],
  boxes: [
    {
      id: 'B_TOP',
      name: 'Top Pink Box',
      section: 'top_shelf',
      color: 'pink',
      capacity: 4,
      filled: 0,
    },
    {
      id: 'B_L1',
      name: 'Track Red Box',
      section: 'loop_track',
      color: 'red',
      capacity: 4,
      filled: 0,
    },
    {
      id: 'B_L2',
      name: 'Track Magenta Box',
      section: 'loop_track',
      color: 'magenta',
      capacity: 4,
      filled: 0,
    },
    {
      id: 'B_L3',
      name: 'Track Yellow Box',
      section: 'loop_track',
      color: 'yellow',
      capacity: 4,
      filled: 0,
    },
  ],
};

export const LEVEL_1_WARMUP: LoopSortMap = {
  name: 'Level 1 (Warmup)',
  level: 1,
  description:
    'Introductory level showing basic 2-rack block transfer and box filling.',
  racks: [
    {
      id: 'T1',
      name: 'Top Shelf 1',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['red', 'pink', 'pink', 'pink'],
    },
    {
      id: 'T2',
      name: 'Top Shelf 2',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['pink', 'red', 'red', 'red'],
    },
    {
      id: 'L1',
      name: 'Track Rack A',
      section: 'loop_track',
      capacity: 4,
      blocks: [],
    },
  ],
  boxes: [
    {
      id: 'B_TOP',
      name: 'Top Pink Box',
      section: 'top_shelf',
      color: 'pink',
      capacity: 4,
      filled: 0,
    },
    {
      id: 'B_L1',
      name: 'Track Red Box',
      section: 'loop_track',
      color: 'red',
      capacity: 4,
      filled: 0,
    },
  ],
};

export const LEVEL_ICE_SAMPLE: LoopSortMap = {
  name: 'Sample: Ice Bucket Lock',
  level: 10,
  description:
    'Demonstrates Ice Bucket mechanic: Rack T2 is frozen until adjacent Rack T1 is completely emptied.',
  racks: [
    {
      id: 'T1',
      name: 'Buffer Rack (Empty Me)',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['blue', 'blue'],
      adjacentIds: ['T2'],
    },
    {
      id: 'T2',
      name: 'Frozen Ice Rack',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['red', 'yellow', 'yellow'],
      iceLockedBy: 'T1',
    },
    {
      id: 'L1',
      name: 'Loop Staging Rack',
      section: 'loop_track',
      capacity: 4,
      blocks: ['yellow', 'red', 'red'],
    },
  ],
  boxes: [
    {
      id: 'B_L1',
      name: 'Blue Box',
      section: 'loop_track',
      color: 'blue',
      capacity: 2,
      filled: 0,
    },
    {
      id: 'B_L2',
      name: 'Yellow Box',
      section: 'loop_track',
      color: 'yellow',
      capacity: 3,
      filled: 0,
    },
    {
      id: 'B_L3',
      name: 'Red Box',
      section: 'loop_track',
      color: 'red',
      capacity: 3,
      filled: 0,
    },
  ],
};

export const LEVEL_ROPE_SAMPLE: LoopSortMap = {
  name: 'Sample: Rope Bound Bucket',
  level: 15,
  description:
    'Demonstrates Rope mechanic: Rack L2 is bound by rope until Box B_TOP (Green) is fully completed.',
  racks: [
    {
      id: 'T1',
      name: 'Top Green Rack',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['green', 'green', 'green', 'green'],
    },
    {
      id: 'L1',
      name: 'Track Rack A',
      section: 'loop_track',
      capacity: 4,
      blocks: ['orange', 'orange'],
    },
    {
      id: 'L2',
      name: 'Rope Bound Rack',
      section: 'loop_track',
      capacity: 4,
      blocks: ['orange', 'orange'],
      ropeTiedTo: 'B_TOP',
    },
  ],
  boxes: [
    {
      id: 'B_TOP',
      name: 'Green Goal Box',
      section: 'top_shelf',
      color: 'green',
      capacity: 4,
      filled: 0,
    },
    {
      id: 'B_L1',
      name: 'Orange Goal Box',
      section: 'loop_track',
      color: 'orange',
      capacity: 4,
      filled: 0,
    },
  ],
};

export const LEVEL_COLOR_FILTER_SAMPLE: LoopSortMap = {
  name: 'Sample: Coloured Bucket Filter',
  level: 20,
  description:
    'Demonstrates Coloured Bucket mechanic: Rack T2 only accepts Purple or Pink blocks.',
  racks: [
    {
      id: 'T1',
      name: 'Top Staging',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['purple', 'pink', 'pink'],
    },
    {
      id: 'T2',
      name: 'Purple/Pink Filter Rack',
      section: 'top_shelf',
      capacity: 4,
      blocks: [],
      allowedColors: ['purple', 'pink'],
    },
    {
      id: 'L1',
      name: 'Track Mixed',
      section: 'loop_track',
      capacity: 4,
      blocks: ['pink', 'purple', 'purple'],
    },
  ],
  boxes: [
    {
      id: 'B_L1',
      name: 'Pink Target Box',
      section: 'loop_track',
      color: 'pink',
      capacity: 3,
      filled: 0,
    },
    {
      id: 'B_L2',
      name: 'Purple Target Box',
      section: 'loop_track',
      color: 'purple',
      capacity: 3,
      filled: 0,
    },
  ],
};

export const LEVEL_CONSTRUCTION_MYSTERY_SAMPLE: LoopSortMap = {
  name: 'Sample: Construction & Mystery Blocks',
  level: 25,
  description:
    'Demonstrates Mystery ? blocks and Construction target boxes with concealed colors.',
  racks: [
    {
      id: 'T1',
      name: 'Exposed Staging',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['red', 'blue', 'blue'],
    },
    {
      id: 'L1',
      name: 'Mystery Stack Track',
      section: 'loop_track',
      capacity: 4,
      blocks: ['?', '?', 'red', 'red'],
      isConstruction: true,
      targetColor: 'red',
    },
    {
      id: 'L2',
      name: 'Empty Staging Rack',
      section: 'loop_track',
      capacity: 4,
      blocks: [],
    },
  ],
  boxes: [
    {
      id: 'B_L1',
      name: 'Blue Target Box',
      section: 'loop_track',
      color: 'blue',
      capacity: 2,
      filled: 0,
    },
    {
      id: 'B_L2',
      name: 'Concealed Box (Red)',
      section: 'loop_track',
      color: 'red',
      capacity: 3,
      filled: 0,
      isConstruction: true,
      hiddenColor: 'red',
    },
  ],
};

export const LEVEL_100_BALANCED: LoopSortMap = {
  name: 'Level 100 (Loop Circuit)',
  level: 100,
  description:
    'Balanced circuit level with 3 upper shelf racks, 2 loop racks, and 4 colored target boxes.',
  racks: [
    {
      id: 'T1',
      name: 'Top Shelf 1',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['blue', 'blue', 'yellow', 'yellow'],
    },
    {
      id: 'T2',
      name: 'Top Shelf 2',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['yellow', 'yellow', 'blue', 'blue'],
    },
    {
      id: 'T3',
      name: 'Top Shelf 3',
      section: 'top_shelf',
      capacity: 4,
      blocks: ['green', 'red', 'green', 'red'],
    },
    {
      id: 'L1',
      name: 'Track Rack A',
      section: 'loop_track',
      capacity: 4,
      blocks: ['red', 'green', 'red', 'green'],
    },
    {
      id: 'L2',
      name: 'Track Rack B',
      section: 'loop_track',
      capacity: 4,
      blocks: [],
    },
  ],
  boxes: [
    {
      id: 'B_L1',
      name: 'Track Blue Box',
      section: 'loop_track',
      color: 'blue',
      capacity: 4,
      filled: 0,
    },
    {
      id: 'B_L2',
      name: 'Track Yellow Box',
      section: 'loop_track',
      color: 'yellow',
      capacity: 4,
      filled: 0,
    },
    {
      id: 'B_L3',
      name: 'Track Green Box',
      section: 'loop_track',
      color: 'green',
      capacity: 4,
      filled: 0,
    },
    {
      id: 'B_L4',
      name: 'Track Red Box',
      section: 'loop_track',
      color: 'red',
      capacity: 4,
      filled: 0,
    },
  ],
};

/**
 * Permute colors of a map while keeping the structural layout and positions identical.
 */
export function shuffleMapColors(map: LoopSortMap): LoopSortMap {
  const colorSet = new Set<string>();
  for (const box of map.boxes) {
    if (box.color !== '?') colorSet.add(box.color);
  }
  for (const rack of map.racks) {
    for (const b of rack.blocks) {
      if (b !== '?') colorSet.add(b);
    }
  }

  const originalColors = Array.from(colorSet);
  const palette = [
    'pink',
    'red',
    'yellow',
    'orange',
    'blue',
    'green',
    'purple',
    'magenta',
    'brown',
    'grey',
  ];

  const shuffledPalette = [...palette].sort(() => Math.random() - 0.5);

  const colorMap = new Map<string, string>();
  originalColors.forEach((orig, idx) => {
    colorMap.set(orig, shuffledPalette[idx % shuffledPalette.length]);
  });

  return {
    ...map,
    name: `${map.name} (Re-colored)`,
    boxes: map.boxes.map((b) => ({
      ...b,
      color: colorMap.get(b.color) || b.color,
      filled: 0,
    })),
    racks: map.racks.map((r) => ({
      ...r,
      blocks: r.blocks.map((blk) =>
        blk === '?' ? '?' : colorMap.get(blk) || blk,
      ),
      allowedColors: r.allowedColors
        ? r.allowedColors.map((c) => colorMap.get(c) || c)
        : undefined,
    })),
  };
}

export const PRESET_MAPS: LoopSortMap[] = [
  LEVEL_259_EXPOSED,
  LEVEL_1_WARMUP,
  LEVEL_ICE_SAMPLE,
  LEVEL_ROPE_SAMPLE,
  LEVEL_COLOR_FILTER_SAMPLE,
  LEVEL_CONSTRUCTION_MYSTERY_SAMPLE,
  LEVEL_100_BALANCED,
];
