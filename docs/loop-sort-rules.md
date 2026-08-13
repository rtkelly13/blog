# Loop Sort: Official Puzzle Rules & Mechanics FAQ

This document serves as the comprehensive rulebook for **Loop Sort**, structured as an FAQ-style reference suitable for display in rule modals, help dialogs, and game documentation.

---

### Q: What is the primary objective of Loop Sort?
**A:** The objective of Loop Sort is to clear the board by transferring colored blocks from vertical storage racks into matching target collection boxes. A level is won when all target boxes are completely filled with their required colors and all racks are cleared or properly sorted.

---

### Q: How do vertical racks (buckets) work?
**A:** Each rack acts as a **Last-In, First-Out (LIFO) stack** with a fixed maximum capacity (typically 4 blocks). 
- You can only pick up and move the **top-most block** in a rack.
- You can drop a block into another rack only if that destination rack is not full and its current top block matches the incoming color (or if the destination rack is completely empty).

---

### Q: What is the difference between the Upper Shelf and the Conveyor Loop Track?
**A:** Levels are divided into two physical sections:
1. **The Upper Shelf:** Fixed top holding racks and dedicated target boxes. These provide stable holding positions for staging stacks during sorting.
2. **The Conveyor Loop Track:** A continuous loop carrying racks and target box cars around a circuit. Boxes and racks on the loop interact sequentially as moves are executed.

---

### Q: How do Target Boxes function?
**A:** Target boxes are dedicated goal containers with a specific color requirement and target capacity (e.g., Pink Box with capacity 4).
- Whenever an active rack has a top block matching the color of an available target box, that block can be directly deposited into the box.
- Once a target box reaches its capacity, it is marked as **Completed** and removed or sealed, freeing up space and unlocking any tied progression mechanics.

---

### Q: What are Color-Covered (Shrouded) Sections and how do they unlock?
**A:** Color-Covered sections are trucks or bucket slots draped under a colored fabric/capsule shroud (e.g., Pink Shroud, Red Shroud).
- A covered section remains inactive and sealed **until a complete stack of that specific color is assembled or deposited** (e.g., 4 blocks of that color are fully stacked or completed in the preceding target truck).
- Once the required color stack is completed, the shroud pulls away, uncovering the underlying target truck or rack for active play.

---

### Q: What are Ice Buckets and how do you unlock them?
**A:** Ice Buckets are encased in frozen ice blocks. 
- While frozen, an ice bucket is completely inert: you **cannot remove blocks** from it and you **cannot deposit blocks** into it.
- **To break the ice:** You must completely empty the designated **adjacent bucket** (reduce its block count to 0). As soon as the adjacent bucket is cleared, the ice shatters and the frozen bucket immediately becomes available for play.

---

### Q: What are Rope (Tied) Buckets and how are they freed?
**A:** Rope Buckets are bound tightly by thick ropes, preventing any block transfers in or out.
- **To untie the rope:** You must achieve the specific condition linked to that bucket—typically **fully solving or clearing an associated reference bucket or target box**. 
- Once the linked goal is met, the rope snaps, granting immediate access to the stack beneath.

---

### Q: How do Coloured (Restricted) Buckets work?
**A:** Unlike standard neutral racks which can accept any color when empty, **Coloured Buckets** have a permanent color filter constraint.
- Only blocks of the designated matching color(s) are permitted inside that bucket at any time.
- Attempting to place an unapproved color into a coloured bucket is an invalid move, even if the bucket is empty.

---

### Q: What are Construction Buckets and Mystery Targets?
**A:** Construction Buckets are covered under warning tape and construction scaffolding.
- At the start of the level, the required target color or block identities are **unknown and hidden**.
- They are designed to create strategic fog-of-war. As you progress, clear adjacent blockers, or trigger progression thresholds, the construction scaffolding drops, revealing the true color requirements.

---

### Q: Why do some levels have hidden or mystery blocks (`?`)?
**A:** In standard gameplay, sub-surface blocks beneath the top visible layer are obscured with a mystery `?` badge. 
- You cannot know the color of a mystery block with 100% visual certainty until all blocks stacked on top of it have been removed.
- However, strategic players can often **deduce** hidden colors by calculating the total capacity demanded by all target boxes versus the currently visible blocks on the board.

---

### Q: What constitutes an invalid move?
**A:** The game engine rejects any move that violates the following fundamental constraints:
1. Attempting to pull from an empty rack.
2. Attempting to interact with an **ice-locked**, **rope-bound**, or **color-covered** bucket.
3. Placing a block into a full rack (`blocks.length >= capacity`).
4. Placing a block onto a non-matching top block (e.g., placing a Green block onto a Red block).
5. Violating a bucket's `allowed_colors` constraint.
6. Depositing a block into a target box of the wrong color.

---

### Q: How does the optimal solver navigate these restrictions?
**A:** The automated solver builds a state-space search graph where each node tracks rack stacks, bucket lock states (ice, ropes, color shrouds), target box fill counts, and color constraints. It computes the shortest deterministic path of moves to transition from the initial configuration to a fully solved victory state.
