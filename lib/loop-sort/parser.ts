import type { LoopSortMap, Rack, TargetBox } from './types';

/**
 * Standardize color names to lowercase trimmed strings.
 */
export function normalizeColor(color: string): string {
  const c = color.trim().toLowerCase();
  if (c === 'purple' || c === 'violet') return 'purple';
  if (c === 'pink' || c === 'lightpink') return 'pink';
  if (c === 'magenta' || c === 'fuchsia' || c === 'hotpink') return 'magenta';
  if (c === 'red') return 'red';
  if (c === 'yellow') return 'yellow';
  if (c === 'orange') return 'orange';
  if (c === 'blue' || c === 'lightblue' || c === 'cyan') return 'blue';
  if (c === 'green' || c === 'lime') return 'green';
  if (c === 'brown') return 'brown';
  if (c === 'grey' || c === 'gray') return 'grey';
  return c || 'grey';
}

/**
 * Serialize a LoopSortMap to a clean, human-readable structured text format.
 */
export function stringifyMap(map: LoopSortMap): string {
  const lines: string[] = [];
  lines.push(`# Loop Sort Map Definition`);
  lines.push(`NAME: ${map.name}`);
  if (map.level) lines.push(`LEVEL: ${map.level}`);
  lines.push('');

  lines.push('# Upper Shelf Racks');
  const topRacks = map.racks.filter((r) => r.section === 'top_shelf');
  for (const rack of topRacks) {
    lines.push(`${rack.id}: ${rack.blocks.join(', ')}`);
  }

  lines.push('');
  lines.push('# Upper Shelf Target Boxes');
  const topBoxes = map.boxes.filter((b) => b.section === 'top_shelf');
  for (const box of topBoxes) {
    lines.push(`${box.id}: ${box.color} (${box.capacity})`);
  }

  lines.push('');
  lines.push('# Conveyor Loop Track Racks');
  const loopRacks = map.racks.filter((r) => r.section === 'loop_track');
  for (const rack of loopRacks) {
    lines.push(`${rack.id}: ${rack.blocks.join(', ')}`);
  }

  lines.push('');
  lines.push('# Conveyor Loop Target Boxes');
  const loopBoxes = map.boxes.filter((b) => b.section === 'loop_track');
  for (const box of loopBoxes) {
    lines.push(`${box.id}: ${box.color} (${box.capacity})`);
  }

  return lines.join('\n');
}

/**
 * Parse structured text or JSON input into a LoopSortMap structure.
 */
export function parseMapText(text: string): LoopSortMap {
  const trimmed = text.trim();

  // Check if JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.racks)) {
        return {
          name: parsed.name || 'Custom Map',
          level: parsed.level,
          racks: parsed.racks.map((r: any) => ({
            id: String(r.id),
            name: r.name || String(r.id),
            section: r.section === 'top_shelf' ? 'top_shelf' : 'loop_track',
            capacity: Number(r.capacity) || 4,
            blocks: Array.isArray(r.blocks)
              ? r.blocks.map((b: string) => normalizeColor(b))
              : [],
          })),
          boxes: Array.isArray(parsed.boxes)
            ? parsed.boxes.map((b: any) => ({
                id: String(b.id),
                name: b.name || String(b.id),
                section: b.section === 'top_shelf' ? 'top_shelf' : 'loop_track',
                color: normalizeColor(b.color),
                capacity: Number(b.capacity) || 4,
                filled: Number(b.filled) || 0,
              }))
            : [],
        };
      }
    } catch {
      // Fallback to text line parser
    }
  }

  // Parse custom key-value text lines
  let name = 'Custom Map';
  let level: number | undefined;
  const racks: Rack[] = [];
  const boxes: TargetBox[] = [];

  const lines = text.split('\n');
  let currentSection: 'top_shelf' | 'loop_track' = 'top_shelf';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    // Skip empty lines and full line comments
    if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//')) {
      if (
        rawLine.toLowerCase().includes('conveyor') ||
        rawLine.toLowerCase().includes('loop')
      ) {
        currentSection = 'loop_track';
      } else if (
        rawLine.toLowerCase().includes('upper') ||
        rawLine.toLowerCase().includes('top')
      ) {
        currentSection = 'top_shelf';
      }
      continue;
    }

    if (rawLine.startsWith('[') && rawLine.endsWith(']')) {
      const secTag = rawLine.slice(1, -1).toUpperCase();
      if (secTag.includes('LOOP') || secTag.includes('TRACK')) {
        currentSection = 'loop_track';
      } else {
        currentSection = 'top_shelf';
      }
      continue;
    }

    const colonIdx = rawLine.indexOf(':');
    const eqIdx = rawLine.indexOf('=');
    const sepIdx = colonIdx !== -1 ? colonIdx : eqIdx;

    if (sepIdx === -1) continue;

    const key = rawLine.substring(0, sepIdx).trim();
    const val = rawLine.substring(sepIdx + 1).trim();

    const upperKey = key.toUpperCase();

    if (upperKey === 'NAME') {
      name = val;
      continue;
    }
    if (upperKey === 'LEVEL') {
      level = parseInt(val, 10) || undefined;
      continue;
    }

    // Check if key starts with BOX or B_
    if (upperKey.startsWith('BOX') || upperKey.startsWith('B_')) {
      // Box line, e.g., BOX_TOP: pink (4)
      const colorMatch = val.match(/^([a-zA-Z]+)(?:\s*\(([0-9]+)\))?/);
      if (colorMatch) {
        const color = normalizeColor(colorMatch[1]);
        const capacity = colorMatch[2] ? parseInt(colorMatch[2], 10) : 4;
        const boxSec = upperKey.includes('TOP') ? 'top_shelf' : currentSection;

        boxes.push({
          id: key,
          name: `Box (${color.toUpperCase()})`,
          section: boxSec,
          color,
          capacity,
          filled: 0,
        });
      }
      continue;
    }

    // Otherwise, interpret as Rack definition (e.g. T1: red, pink, grey)
    const blocksStr = val.split(/[,;\s]+/).filter(Boolean);
    const blocks = blocksStr.map((b) => normalizeColor(b));

    const rackSec = key.toUpperCase().startsWith('T')
      ? 'top_shelf'
      : key.toUpperCase().startsWith('L')
        ? 'loop_track'
        : currentSection;

    racks.push({
      id: key,
      name: `Rack ${key}`,
      section: rackSec,
      capacity: Math.max(4, blocks.length),
      blocks,
    });
  }

  if (racks.length === 0) {
    throw new Error('No racks found in map text file. Please check format.');
  }

  return {
    name,
    level,
    racks,
    boxes,
  };
}
