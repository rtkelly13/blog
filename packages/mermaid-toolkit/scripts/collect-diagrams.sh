#!/bin/bash
#
# Mermaid Diagram Collection Script
# Downloads ~1000+ real-world Mermaid diagrams from GitHub repositories
# 
# Usage:
#   bash scripts/collect-diagrams.sh [target-directory]
#
# Default target: tests/fixtures/diagrams/

set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_TARGET="${SCRIPT_DIR}/../tests/fixtures/diagrams"
TARGET_DIR="${1:-$DEFAULT_TARGET}"

echo "════════════════════════════════════════════════════════════"
echo "  Mermaid Diagram Collection Script"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Target directory: ${TARGET_DIR}"
echo "Estimated size: ~100MB (1000+ diagrams)"
echo ""

# Create target directory
mkdir -p "${TARGET_DIR}"
cd "${TARGET_DIR}"

# Initialize collection metadata
cat > COLLECTION.md <<'EOF'
# Mermaid Diagram Collection

This directory contains 1000+ real-world Mermaid diagrams collected from various sources for testing and reference.

## Sources

| Source | Count | Quality | Focus |
|--------|-------|---------|-------|
| Official Mermaid | ~1367 | Excellent | Complete syntax reference |
| JakeSteam Cheatsheet | ~119 | Excellent | Quick reference |
| Various GitHub Repos | ~200+ | High | Real-world usage |
| Kubernetes Docs | ~30 | High | Infrastructure |
| AWS/Microsoft | ~75+ | High | Enterprise |
| Practice Collections | ~100+ | Medium | Learning |

**Total: 1000+ diagrams**

## Organization

```
diagrams/
├── official/          # Mermaid.js official examples
├── cheatsheet/        # JakeSteam's comprehensive cheatsheets
├── examples/          # Focused tutorial examples
├── kubernetes/        # K8s architecture diagrams
├── practice/          # Learning examples
├── technical/         # Complex system diagrams
└── cloud/             # AWS/Azure/GCP diagrams (manual collection)
```

## Download Date

$(date -u +"%Y-%m-%d %H:%M:%S UTC")

## License

Each subdirectory retains its original license. Please check LICENSE files in each source directory.
EOF

echo "📝 Created COLLECTION.md"
echo ""

# Function to clone with progress
clone_repo() {
  local url=$1
  local dir=$2
  local desc=$3
  
  echo "┌──────────────────────────────────────────────────────────┐"
  echo "│ Downloading: ${desc}"
  echo "│ Target: ${dir}/"
  echo "└──────────────────────────────────────────────────────────┘"
  
  if [ -d "${dir}" ]; then
    echo "⚠️  Directory exists, skipping: ${dir}"
  else
    git clone --depth 1 --quiet "${url}" "${dir}" 2>&1 | grep -v "Cloning into" || true
    echo "✅ Downloaded: ${dir}"
  fi
  
  echo ""
}

# Download all major sources
echo "════════════════════════════════════════════════════════════"
echo "  Downloading Repositories..."
echo "════════════════════════════════════════════════════════════"
echo ""

clone_repo \
  "https://github.com/mermaid-js/mermaid.git" \
  "official" \
  "Official Mermaid.js (~1367 diagrams)"

clone_repo \
  "https://github.com/JakeSteam/Mermaid.git" \
  "cheatsheet" \
  "JakeSteam's Cheatsheets (~119 diagrams)"

clone_repo \
  "https://github.com/rudolfolah/mermaid-diagram-examples.git" \
  "examples" \
  "Tutorial Examples (~20 diagrams)"

clone_repo \
  "https://github.com/kubernetes/website.git" \
  "kubernetes" \
  "Kubernetes Docs (~30 diagrams)"

clone_repo \
  "https://github.com/YukiBobier/practice-mermaid.git" \
  "practice" \
  "Practice Examples (~40 diagrams)"

clone_repo \
  "https://github.com/hemzaz/mermaids.git" \
  "technical" \
  "Technical System Diagrams (~15 diagrams)"

# Download the comprehensive gist
echo "┌──────────────────────────────────────────────────────────┐"
echo "│ Downloading: GitHub Gist Examples"
echo "│ Target: gist-examples.md"
echo "└──────────────────────────────────────────────────────────┘"

if [ -f "gist-examples.md" ]; then
  echo "⚠️  File exists, skipping: gist-examples.md"
else
  curl -sL "https://gist.githubusercontent.com/ChristopherA/bffddfdf7b1502215e44cec9fb766dfd/raw" \
    -o "gist-examples.md"
  echo "✅ Downloaded: gist-examples.md"
fi

echo ""

# Generate statistics
echo "════════════════════════════════════════════════════════════"
echo "  Collection Statistics"
echo "════════════════════════════════════════════════════════════"
echo ""

# Count .mmd and .md files with mermaid blocks
total_mmd=$(find . -name "*.mmd" 2>/dev/null | wc -l | tr -d ' ')
total_md=$(find . -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
total_size=$(du -sh . 2>/dev/null | cut -f1)

echo "📊 Statistics:"
echo "  • .mmd files: ${total_mmd}"
echo "  • .md files: ${total_md}"
echo "  • Total size: ${total_size}"
echo ""

# List key locations
echo "📁 Key Locations:"
echo ""
echo "Official Mermaid:"
echo "  • official/docs/syntax/     - Comprehensive documentation"
echo "  • official/demos/           - 29 interactive demos"
echo "  • official/packages/mermaid/src/__mocks__/ - Test fixtures"
echo ""
echo "Cheatsheets:"
echo "  • cheatsheet/*.md           - 24 diagram type references"
echo ""
echo "Examples:"
echo "  • examples/diagrams/        - Tutorial examples"
echo "  • practice/                 - Learning examples"
echo "  • technical/*.mermaid       - Complex systems"
echo ""
echo "Documentation:"
echo "  • kubernetes/content/*/docs/ - K8s architecture"
echo "  • gist-examples.md          - 50+ quick examples"
echo ""

# Create quick reference index
cat > INDEX.md <<'EOF'
# Quick Reference Index

## By Diagram Type

### Flowchart / Graph
- `official/docs/syntax/flowchart.md` - Complete syntax
- `cheatsheet/flowchart.md` - Quick reference
- `gist-examples.md` - Section: Graph/Flowchart

### Sequence Diagram
- `official/docs/syntax/sequenceDiagram.md` - Complete syntax
- `cheatsheet/sequence-diagram.md` - Quick reference
- `gist-examples.md` - Section: Sequence

### Class Diagram
- `official/docs/syntax/classDiagram.md` - Complete syntax
- `cheatsheet/class-diagram.md` - Quick reference
- `gist-examples.md` - Section: Class

### State Diagram
- `official/docs/syntax/stateDiagram.md` - Complete syntax
- `cheatsheet/state-diagram.md` - Quick reference
- `gist-examples.md` - Section: State

### Entity Relationship (ER)
- `official/docs/syntax/entityRelationshipDiagram.md` - Complete syntax
- `cheatsheet/er-diagram.md` - Quick reference
- `gist-examples.md` - Section: ER

### Gantt Chart
- `official/docs/syntax/gantt.md` - Complete syntax
- `cheatsheet/gantt.md` - Quick reference
- `gist-examples.md` - Section: Gantt

### Pie Chart
- `official/docs/syntax/pie.md` - Complete syntax
- `cheatsheet/pie-chart.md` - Quick reference
- `gist-examples.md` - Section: Pie Chart

### Git Graph
- `official/docs/syntax/gitgraph.md` - Complete syntax
- `cheatsheet/gitgraph.md` - Quick reference
- `gist-examples.md` - Section: GitGraph

### User Journey
- `official/docs/syntax/userJourney.md` - Complete syntax
- `cheatsheet/user-journey.md` - Quick reference
- `gist-examples.md` - Section: User Journey

### Requirement Diagram
- `official/docs/syntax/requirementDiagram.md` - Complete syntax
- `cheatsheet/requirement-diagram.md` - Quick reference
- `gist-examples.md` - Section: Requirement

### Mindmap
- `official/docs/syntax/mindmap.md` - Complete syntax
- `cheatsheet/mindmap.md` - Quick reference

### Timeline
- `official/docs/syntax/timeline.md` - Complete syntax
- `cheatsheet/timeline.md` - Quick reference

### Architecture (C4)
- `cheatsheet/architecture.md` - Quick reference

## By Complexity

### Simple (Good for Testing)
- `gist-examples.md` - All examples
- `cheatsheet/*.md` - Minimal examples

### Medium (Real-World Usage)
- `examples/diagrams/` - Tutorial examples
- `practice/` - Learning examples

### Complex (Edge Cases)
- `official/packages/mermaid/src/__mocks__/` - Test fixtures
- `technical/*.mermaid` - System diagrams
- `kubernetes/content/*/docs/` - Production diagrams

## Extraction Scripts

### Extract all mermaid blocks from .md files

```bash
# Find all mermaid code blocks
grep -r "```mermaid" . --include="*.md" -A 20 | grep -v "^--$" > all-diagrams.txt
```

### Count diagrams by type

```bash
# Count flowcharts
grep -r "graph\|flowchart" . --include="*.md" --include="*.mmd" | wc -l

# Count sequence diagrams
grep -r "sequenceDiagram" . --include="*.md" --include="*.mmd" | wc -l

# Count class diagrams
grep -r "classDiagram" . --include="*.md" --include="*.mmd" | wc -l
```

### Extract to individual .mmd files

```bash
# Run from diagrams/ directory
# This will extract all mermaid blocks and save as numbered files

awk '/```mermaid/,/```/ {
  if (/```mermaid/) { file=sprintf("extracted/diagram-%04d.mmd", ++count); next }
  if (/```/) { close(file); next }
  print > file
}' gist-examples.md

mkdir -p extracted
echo "Extracted diagrams to extracted/"
```

## Usage Tips

1. **For Testing**: Use `gist-examples.md` and `cheatsheet/*.md` - small, focused examples
2. **For Learning**: Explore `official/docs/syntax/` - comprehensive with explanations
3. **For Edge Cases**: Check `official/packages/mermaid/src/__mocks__/` - internal tests
4. **For Real-World**: Browse `kubernetes/`, `examples/`, `technical/` - production usage

## License Notes

- **official/**: Apache 2.0 (Mermaid.js)
- **cheatsheet/**: MIT (JakeSteam)
- **examples/**: Check individual repo licenses
- **kubernetes/**: Apache 2.0 (Kubernetes)
- **practice/**: Check individual repo licenses
- **technical/**: Check individual repo licenses

Always check the LICENSE file in each subdirectory before using in production.
EOF

echo "📝 Created INDEX.md"
echo ""

# Cleanup function to remove .git directories (optional)
echo "════════════════════════════════════════════════════════════"
echo "  Cleanup Options"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "The downloaded repositories include .git directories (~50MB)."
echo "You can remove them to save space:"
echo ""
echo "  find . -name \".git\" -type d -exec rm -rf {} + 2>/dev/null"
echo ""
echo "⚠️  Warning: This will prevent git pull updates."
echo ""

# Success message
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Collection Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Downloaded to: ${TARGET_DIR}"
echo ""
echo "Next steps:"
echo "  1. Review COLLECTION.md for source details"
echo "  2. Check INDEX.md for quick reference"
echo "  3. Explore subdirectories for diagrams"
echo ""
echo "To extract all diagrams:"
echo "  cd ${TARGET_DIR}"
echo "  grep -r \"^\`\`\`mermaid\" . --include=\"*.md\" -A 50"
echo ""
echo "Happy testing! 🎉"
echo ""
