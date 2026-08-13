# Loop Sort Level Map Schema Specification

See full documentation at [blog/docs/loop-sort-schema.md](file:///Users/ryankelly/code/personal/blog/docs/loop-sort-schema.md).

## Quick Syntax Reference

```ini
# Level Metadata
NAME: Level 259 (Super Hard)
LEVEL: 259

# Upper Shelf Racks & Target Boxes
[TOP_SHELF]
T1: brown, grey, brown
T2: red, pink, pink { ice_locked_by: T1 }
T3: yellow, yellow { rope_tied_to: T4 }
T4: pink, orange, pink
T5: orange, purple, orange { allowed_colors: [orange, purple] }
BOX_TOP: pink (4) { covered_color: pink }

# Conveyor Loop Track Racks & Target Boxes
[LOOP_TRACK]
L1: orange, green, green
L2: blue, grey, brown { ice_locked_by: L1 }
L3: yellow, yellow, purple
L4: ?, ?, magenta, magenta { construction: true }
L5: green, red, red, magenta
BOX_L1: red (4)
BOX_L2: magenta (4) { covered_color: red }
BOX_L3: yellow (4) { construction: true }
```

### Supported Mechanics
- **Color-Covered Sections** (`covered_color: <COLOR>`): Shrouded/covered until that specific color is completely stacked.
- **Ice Buckets** (`ice_locked_by: <RACK_ID>`): Unlocked only when adjacent bucket is emptied.
- **Rope Buckets** (`rope_tied_to: <RACK_OR_BOX_ID>`): Unlocked when the linked bucket/box is solved.
- **Coloured Buckets** (`allowed_colors: [<COLOR_1>, ...]`): Restricts entry to specific colors.
- **Construction Buckets** (`construction: true`): Conceals color until unlocked during gameplay.
- **Mystery Blocks** (`?` or `hidden`): Concealed sub-surface blocks.
