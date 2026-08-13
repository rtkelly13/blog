import type { LoopSortMap } from './types';

export const LEVEL_259_EXPOSED: LoopSortMap = {
  name: 'Level 259 (Super Hard - Fully Exposed)',
  level: 259,
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

export const LEVEL_100_BALANCED: LoopSortMap = {
  name: 'Level 100 (Loop Circuit)',
  level: 100,
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
    colorSet.add(box.color);
  }
  for (const rack of map.racks) {
    for (const b of rack.blocks) {
      colorSet.add(b);
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
      blocks: r.blocks.map((blk) => colorMap.get(blk) || blk),
    })),
  };
}

export const PRESET_MAPS = [
  LEVEL_259_EXPOSED,
  LEVEL_1_WARMUP,
  LEVEL_100_BALANCED,
];
