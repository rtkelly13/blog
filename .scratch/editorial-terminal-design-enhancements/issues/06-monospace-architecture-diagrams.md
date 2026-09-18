# Issue 06: Monospace Vector SVG Architecture Diagram Conventions & Components

Status: needs-triage

## Summary

Establish guidelines and reusable React / SVG primitives for monospace system architecture diagrams, inspired by the Mini-Kafka broker cluster diagram on `builddistributedsystem.com`.

## Motivation

Dense distributed systems engineering topics (such as Apache Kafka, Apache Parquet, KRaft consensus, and storage engines) need clear architectural schematics. Most generated diagrams drift toward generic cloud icons or soft-edged flowchart blocks. A standardized monospace SVG style integrates directly with the brutalist neon-terminal design system.

## Requirements & Design Spec

1. **Monospace Typography**:
   - Every label, title, and metric in diagrams must use `font-family="monospace"` (or IBM Plex Mono / JetBrains Mono).
2. **Zero Border Radius on Diagram Elements**:
   - In contrast to upstream (`rx="4"`), all rects must have `rx="0"`.
3. **Semantic Role-Based Color Encoding**:
   - `Partition Leader` / active state: Solid fill with high contrast (`fill="#4ade80"` in Midnight, pen-green in Sketch) + bold border.
   - `Follower / Replica`: Dashed stroke (`stroke-dasharray="3,2"`), muted fill (`#fca5a5` / `#ff8c00`).
   - `Storage / Memory Blocks`: Segmented vertical or horizontal block stacks (e.g. partition log segments).
   - `Quorum / Consensus`: Distinct dashed boundary box (`stroke-dasharray="5,3"`).
4. **Embedded Diagram Legend**:
   - A dedicated legend row anchored directly inside the SVG canvas so the diagram is self-contained when shared or exported.
5. **Theme Support**:
   - Diagram fills and strokes must read crisp on both `#0a0a1a` (Midnight) and `#f5f3ec` (Sketch).

## Acceptance Criteria

- [ ] SVG template component accepts reactive data or can be written cleanly in MDX.
- [ ] Conforms to the zero-radius and high-contrast invariants.
- [ ] Seamless visual harmony with existing `@rtkelly/mermaid-toolkit` diagrams.

## Comments
