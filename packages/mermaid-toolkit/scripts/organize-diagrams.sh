#!/bin/bash
#
# Extract and organize Mermaid diagrams by type
# This script extracts mermaid code blocks from markdown files and organizes them

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIAGRAMS_DIR="${SCRIPT_DIR}/../tests/fixtures/diagrams"
ORGANIZED_DIR="${DIAGRAMS_DIR}/organized"

echo "════════════════════════════════════════════════════════════"
echo "  Organizing Mermaid Diagrams by Type"
echo "════════════════════════════════════════════════════════════"
echo ""

cd "${DIAGRAMS_DIR}"

mkdir -p organized/{flowchart,sequence,class,state,er,gantt,pie,journey,git,requirement,mindmap,timeline,c4,other}

echo "Extracting diagrams from markdown files..."
echo ""

counter_flowchart=0
counter_sequence=0
counter_class=0
counter_state=0
counter_er=0
counter_gantt=0
counter_pie=0
counter_journey=0
counter_git=0
counter_requirement=0
counter_mindmap=0
counter_timeline=0
counter_c4=0
counter_other=0

find . -name "*.md" -type f | while read -r file; do
  awk '
    /^```mermaid/ {
      in_block=1
      content=""
      next
    }
    /^```/ && in_block {
      if (content != "") {
        print content
        print "---BLOCK-END---"
      }
      in_block=0
      content=""
      next
    }
    in_block {
      content = content $0 "\n"
    }
  ' "$file"
done | awk -v outdir="${ORGANIZED_DIR}" '
  BEGIN {
    flowchart=0; sequence=0; class=0; state=0; er=0
    gantt=0; pie=0; journey=0; git=0; requirement=0
    mindmap=0; timeline=0; c4=0; other=0
  }
  /---BLOCK-END---/ {
    if (buffer == "") next
    
    type="other"
    if (buffer ~ /^(graph|flowchart)/) type="flowchart"
    else if (buffer ~ /^sequenceDiagram/) type="sequence"
    else if (buffer ~ /^classDiagram/) type="class"
    else if (buffer ~ /^stateDiagram/) type="state"
    else if (buffer ~ /^erDiagram/) type="er"
    else if (buffer ~ /^gantt/) type="gantt"
    else if (buffer ~ /^pie/) type="pie"
    else if (buffer ~ /^journey/) type="journey"
    else if (buffer ~ /^gitGraph/) type="git"
    else if (buffer ~ /^requirementDiagram/) type="requirement"
    else if (buffer ~ /^mindmap/) type="mindmap"
    else if (buffer ~ /^timeline/) type="timeline"
    else if (buffer ~ /^C4/) type="c4"
    
    if (type == "flowchart") filename = sprintf("%s/flowchart/diagram-%04d.mmd", outdir, ++flowchart)
    else if (type == "sequence") filename = sprintf("%s/sequence/diagram-%04d.mmd", outdir, ++sequence)
    else if (type == "class") filename = sprintf("%s/class/diagram-%04d.mmd", outdir, ++class)
    else if (type == "state") filename = sprintf("%s/state/diagram-%04d.mmd", outdir, ++state)
    else if (type == "er") filename = sprintf("%s/er/diagram-%04d.mmd", outdir, ++er)
    else if (type == "gantt") filename = sprintf("%s/gantt/diagram-%04d.mmd", outdir, ++gantt)
    else if (type == "pie") filename = sprintf("%s/pie/diagram-%04d.mmd", outdir, ++pie)
    else if (type == "journey") filename = sprintf("%s/journey/diagram-%04d.mmd", outdir, ++journey)
    else if (type == "git") filename = sprintf("%s/git/diagram-%04d.mmd", outdir, ++git)
    else if (type == "requirement") filename = sprintf("%s/requirement/diagram-%04d.mmd", outdir, ++requirement)
    else if (type == "mindmap") filename = sprintf("%s/mindmap/diagram-%04d.mmd", outdir, ++mindmap)
    else if (type == "timeline") filename = sprintf("%s/timeline/diagram-%04d.mmd", outdir, ++timeline)
    else if (type == "c4") filename = sprintf("%s/c4/diagram-%04d.mmd", outdir, ++c4)
    else filename = sprintf("%s/other/diagram-%04d.mmd", outdir, ++other)
    
    print buffer > filename
    close(filename)
    buffer = ""
    next
  }
  {
    buffer = buffer $0 "\n"
  }
  END {
    print "Flowchart:", flowchart > "/dev/stderr"
    print "Sequence:", sequence > "/dev/stderr"
    print "Class:", class > "/dev/stderr"
    print "State:", state > "/dev/stderr"
    print "ER:", er > "/dev/stderr"
    print "Gantt:", gantt > "/dev/stderr"
    print "Pie:", pie > "/dev/stderr"
    print "Journey:", journey > "/dev/stderr"
    print "Git:", git > "/dev/stderr"
    print "Requirement:", requirement > "/dev/stderr"
    print "Mindmap:", mindmap > "/dev/stderr"
    print "Timeline:", timeline > "/dev/stderr"
    print "C4:", c4 > "/dev/stderr"
    print "Other:", other > "/dev/stderr"
  }
'

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Organization Complete!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Organized diagrams available in: organized/"
echo ""

find organized -name "*.mmd" | wc -l | awk '{print "Total extracted: " $1 " diagrams"}'
echo ""

find organized -mindepth 1 -maxdepth 1 -type d | while read -r dir; do
  count=$(find "$dir" -name "*.mmd" | wc -l)
  printf "  %-15s %5d diagrams\n" "$(basename "$dir"):" "$count"
done

echo ""
echo "Ready for testing!"
