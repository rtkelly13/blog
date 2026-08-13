# Loop Sort Level Map Schema Specification

This document formally defines the file schema and game mechanics for **Loop Sort** puzzle map definitions.

Loop Sort levels consist of vertical block stacks (**Racks/Buckets**) and collection destinations (**Target Boxes/Buckets**) arranged along an **Upper Shelf** and a **Conveyor Loop Track**.

---

## 1. Overview & Mechanics

In addition to basic color-sorting rules, Loop Sort introduces spatial positioning, conditional locks, color constraints, and hidden/mystery state:

| Mechanic | Description | Unlock / Behavior Rule |
| :--- | :--- | :--- |
| **Grid & Spatial Positioning** | Buckets and racks exist in specific sequence/grid coordinates. | Spatial adjacency determines neighbor interactions and conveyor traversal order. |
| **Color-Covered Sections (`SHROUD`)** | Trucks or buckets covered under a colored fabric/capsule shroud. | Locked and sealed **until that specific color is completely stacked or assembled**. |
| **Ice Buckets (`ICE`)** | Buckets encased in ice that cannot receive or dispense blocks. | Unfreezes and opens only when a specified **adjacent bucket is completely empty** (`blocks: []`). |
| **Rope / Tied Buckets (`ROPE`)** | Buckets bound with ropes / chains. | Unties and activates only when an associated **reference bucket is fully solved / cleared** (`SOLVED`). |
| **Coloured Buckets (`FILTER`)** | Buckets with a designated color tint/filter restriction. | **Only blocks matching the bucket's allowed color(s)** may be placed inside (unlike neutral transfer racks). |
| **Construction Buckets (`CONSTRUCT`)** | Buckets marked under construction / scaffolding with hidden color targets. | The target color or accepted block identity is **concealed** until uncovered or activated during gameplay. |
| **Mystery Blocks (`?` / `HIDDEN`)** | Sub-surface blocks in a stack whose color identity is obscured. | Only revealed once all blocks positioned above them in the stack have been transferred. |

---

## 2. Text Format Schema (`.loop`, `.txt`, `.map`)

Map files support a human-readable, line-oriented key-value syntax with section headers and inline modifiers.

### 2.1 Grammar & Syntax

```ini
# Level Metadata
NAME: Level 259 (Super Hard)
LEVEL: 259

# [UPPER_SHELF] or [TOP_SHELF]
[TOP_SHELF]
# Syntax: <ID>: <block_1>, <block_2>, ... [modifiers]
T1: brown, grey, brown
T2: red, pink, pink { ice_locked_by: T1 }
T3: yellow, yellow { rope_tied_to: T4 }
T4: pink, orange, pink
T5: orange, purple, orange { allowed_colors: [orange, purple] }

# Upper Target Boxes / Goals
BOX_TOP: pink (4)

# [LOOP_TRACK] or [CONVEYOR]
[LOOP_TRACK]
L1: orange, green, green
L2: blue, grey, brown { ice_locked_by: L1 }
L3: yellow, yellow, purple
L4: ?, ?, magenta, magenta { construction: true, target_color: magenta }
L5: green, red, red, magenta

# Loop Track Target Boxes
BOX_L1: red (4)
BOX_L2: magenta (4)
BOX_L3: yellow (4) { construction: true, hidden_color: yellow }
```

---

## 3. Detailed Component Attributes & Modifiers

### 3.1 Stack Representation
- **Bottom-to-Top**: In the list `[brown, grey, red]`, `brown` is at the **bottom** and `red` is at the **top** (accessible for immediate transfer).
- **Mystery Blocks**: Represented as `?` or `hidden` (e.g. `?, ?, red, blue`).

### 3.2 Bucket Modifiers & Restrictions

| Modifier Key | Format | Example | Description |
| :--- | :--- | :--- | :--- |
| `covered_until_color_stacked` / `covered_color` | String color | `{ covered_color: pink }` | Shrouded/covered until that specific color is completely stacked. |
| `ice_locked_by` / `ice_adjacent` | String ID | `{ ice_locked_by: T1 }` | Bucket remains frozen until rack `T1` has `0` blocks. |
| `rope_tied_to` / `rope_target` | String ID | `{ rope_tied_to: T4 }` | Bucket remains bound until rack/box `T4` is solved/cleared. |
| `allowed_colors` / `color_filter`| Array of strings | `{ allowed_colors: [red] }` | Only blocks of matching color can enter this bucket. |
| `construction` / `mystery` | Boolean | `{ construction: true }` | Conceals target/bucket color until unmasked. |
| `capacity` | Integer | `T1: red, pink (cap: 5)` | Overrides default capacity (default is `4`). |
| `adjacent_to` | Array of String IDs | `{ adjacent_to: [T1, T3] }` | Explicitly defines spatial neighbor linkages. |

---

## 4. JSON Schema Specification

For programmatic interop and API payloads:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "LoopSortMap",
  "type": "object",
  "required": ["name", "racks", "boxes"],
  "properties": {
    "name": { "type": "string" },
    "level": { "type": "integer", "minimum": 1 },
    "description": { "type": "string" },
    "racks": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Rack"
      }
    },
    "boxes": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/TargetBox"
      }
    }
  },
  "$defs": {
    "SectionType": {
      "type": "string",
      "enum": ["top_shelf", "loop_track"]
    },
    "Rack": {
      "type": "object",
      "required": ["id", "section", "capacity", "blocks"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "section": { "$ref": "#/$defs/SectionType" },
        "capacity": { "type": "integer", "default": 4 },
        "blocks": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Stack order: index 0 is bottom, last index is top (active)."
        },
        "iceLockedBy": {
          "type": "string",
          "description": "ID of the adjacent bucket that must be emptied to break the ice."
        },
        "ropeTiedTo": {
          "type": "string",
          "description": "ID of the bucket/box that must be solved to untie this bucket."
        },
        "allowedColors": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Coloured bucket restriction: only these colors can be placed here."
        },
        "isConstruction": {
          "type": "boolean",
          "description": "True if this bucket is under construction and initially masked."
        },
        "adjacentIds": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Spatial neighbors for adjacency checks."
        }
      }
    },
    "TargetBox": {
      "type": "object",
      "required": ["id", "section", "color", "capacity", "filled"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "section": { "$ref": "#/$defs/SectionType" },
        "color": { "type": "string" },
        "capacity": { "type": "integer", "default": 4 },
        "filled": { "type": "integer", "default": 0 },
        "isConstruction": {
          "type": "boolean",
          "description": "True if the target box color is concealed at the start of the level."
        },
        "queueOrder": {
          "type": "integer",
          "description": "Order of arrival onto conveyor loop for multi-wave box delivery."
        }
      }
    }
  }
}
```

---

## 5. Game Rule Execution Semantics

1. **Move Validity**:
   - A block can only be popped from the **top** of an active (unlocked) bucket (`blocks[blocks.length - 1]`).
   - A block can be pushed to another bucket only if:
     1. The destination is **not frozen** (`iceLockedBy` condition is satisfied).
     2. The destination is **not bound by rope** (`ropeTiedTo` condition is satisfied).
     3. The destination has remaining capacity (`blocks.length < capacity`).
     4. If the destination has `allowedColors`, the block matches one of the allowed colors.
     5. The destination top block matches the moving block color OR destination is empty.
2. **Ice Breaking**:
   - When a bucket `R_adj` has `blocks.length === 0`, any frozen bucket `R_ice` with `iceLockedBy === R_adj.id` is immediately shattered and unlocked.
3. **Rope Untying**:
   - When bucket `R_target` completes (all blocks homogenous and full, or target box full), the rope on `R_rope` snaps and unlocks.
4. **Construction Reveal**:
   - Once an active move touches or clears an obstructing blocker, construction scaffolding drops and reveals true color requirements.
