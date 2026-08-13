import type { LoopSortMap, Rack, TargetBox } from './types';

/**
 * Standardize color names to lowercase trimmed strings or '?' for mystery/hidden blocks.
 */
export function normalizeColor(color: string): string {
  const c = color.trim().toLowerCase();
  if (c === '?' || c === 'hidden' || c === 'mystery' || c === 'unknown') {
    return '?';
  }
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
 * Parse modifier dictionary string (e.g. "{ ice_locked_by: T1, allowed_colors: [red, pink] }")
 */
function parseModifiers(modStr: string): Record<string, any> {
  const result: Record<string, any> = {};
  if (!modStr) return result;

  // Clean outer brackets
  let content = modStr.trim();
  if (content.startsWith('{') && content.endsWith('}')) {
    content = content.slice(1, -1).trim();
  }

  // Regex to split on comma outside square brackets
  const tokens = content.match(/([a-zA-Z0-9_-]+)\s*[:=]\s*(\[[^\]]*\]|[^,]+)/g);
  if (!tokens) return result;

  for (const token of tokens) {
    const sepIdx =
      token.indexOf(':') !== -1 ? token.indexOf(':') : token.indexOf('=');
    if (sepIdx === -1) continue;

    const rawKey = token
      .substring(0, sepIdx)
      .trim()
      .toLowerCase()
      .replace(/[-_]/g, '');
    const rawVal = token.substring(sepIdx + 1).trim();

    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      const arr = rawVal
        .slice(1, -1)
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      result[rawKey] = arr;
    } else if (rawVal === 'true') {
      result[rawKey] = true;
    } else if (rawVal === 'false') {
      result[rawKey] = false;
    } else if (/^\d+$/.test(rawVal)) {
      result[rawKey] = parseInt(rawVal, 10);
    } else {
      result[rawKey] = rawVal.replace(/^["']|["']$/g, '');
    }
  }

  return result;
}

/**
 * Serialize modifiers object to `{ key: value, ... }` string format.
 */
function formatModifiers(mods: Record<string, any>): string {
  const pairs: string[] = [];
  for (const [k, v] of Object.entries(mods)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length > 0) {
        pairs.push(`${k}: [${v.join(', ')}]`);
      }
    } else if (typeof v === 'boolean') {
      if (v) pairs.push(`${k}: true`);
    } else {
      pairs.push(`${k}: ${v}`);
    }
  }
  return pairs.length > 0 ? ` { ${pairs.join(', ')} }` : '';
}

/**
 * Serialize a LoopSortMap to a clean, human-readable structured text format.
 */
export function stringifyMap(map: LoopSortMap): string {
  const lines: string[] = [];
  lines.push(`# Loop Sort Map Definition`);
  lines.push(`NAME: ${map.name}`);
  if (map.level) lines.push(`LEVEL: ${map.level}`);
  if (map.description) lines.push(`DESCRIPTION: ${map.description}`);
  lines.push('');

  lines.push('# Upper Shelf Racks');
  const topRacks = map.racks.filter((r) => r.section === 'top_shelf');
  for (const rack of topRacks) {
    const mods: Record<string, any> = {};
    if (rack.iceLockedBy) mods['ice_locked_by'] = rack.iceLockedBy;
    if (rack.ropeTiedTo) mods['rope_tied_to'] = rack.ropeTiedTo;
    if (rack.allowedColors && rack.allowedColors.length > 0)
      mods['allowed_colors'] = rack.allowedColors;
    if (rack.isConstruction) mods['construction'] = true;
    if (rack.targetColor) mods['target_color'] = rack.targetColor;
    if (rack.adjacentIds && rack.adjacentIds.length > 0)
      mods['adjacent_to'] = rack.adjacentIds;
    if (
      rack.capacity !== 4 &&
      rack.capacity !== Math.max(4, rack.blocks.length)
    ) {
      mods['capacity'] = rack.capacity;
    }

    const blocksStr = rack.blocks.length > 0 ? rack.blocks.join(', ') : 'empty';
    lines.push(`${rack.id}: ${blocksStr}${formatModifiers(mods)}`);
  }

  lines.push('');
  lines.push('# Upper Shelf Target Boxes');
  const topBoxes = map.boxes.filter((b) => b.section === 'top_shelf');
  for (const box of topBoxes) {
    const mods: Record<string, any> = {};
    if (box.isConstruction) mods['construction'] = true;
    if (box.hiddenColor) mods['hidden_color'] = box.hiddenColor;
    if (box.queueOrder !== undefined) mods['queue_order'] = box.queueOrder;
    lines.push(
      `${box.id}: ${box.color} (${box.capacity})${formatModifiers(mods)}`,
    );
  }

  lines.push('');
  lines.push('# Conveyor Loop Track Racks');
  const loopRacks = map.racks.filter((r) => r.section === 'loop_track');
  for (const rack of loopRacks) {
    const mods: Record<string, any> = {};
    if (rack.iceLockedBy) mods['ice_locked_by'] = rack.iceLockedBy;
    if (rack.ropeTiedTo) mods['rope_tied_to'] = rack.ropeTiedTo;
    if (rack.allowedColors && rack.allowedColors.length > 0)
      mods['allowed_colors'] = rack.allowedColors;
    if (rack.isConstruction) mods['construction'] = true;
    if (rack.targetColor) mods['target_color'] = rack.targetColor;
    if (rack.adjacentIds && rack.adjacentIds.length > 0)
      mods['adjacent_to'] = rack.adjacentIds;
    if (
      rack.capacity !== 4 &&
      rack.capacity !== Math.max(4, rack.blocks.length)
    ) {
      mods['capacity'] = rack.capacity;
    }

    const blocksStr = rack.blocks.length > 0 ? rack.blocks.join(', ') : 'empty';
    lines.push(`${rack.id}: ${blocksStr}${formatModifiers(mods)}`);
  }

  lines.push('');
  lines.push('# Conveyor Loop Target Boxes');
  const loopBoxes = map.boxes.filter((b) => b.section === 'loop_track');
  for (const box of loopBoxes) {
    const mods: Record<string, any> = {};
    if (box.isConstruction) mods['construction'] = true;
    if (box.hiddenColor) mods['hidden_color'] = box.hiddenColor;
    if (box.queueOrder !== undefined) mods['queue_order'] = box.queueOrder;
    lines.push(
      `${box.id}: ${box.color} (${box.capacity})${formatModifiers(mods)}`,
    );
  }

  return lines.join('\n');
}

/**
 * Parse structured text or JSON input into a LoopSortMap structure with full mechanics support.
 */
export function parseMapText(text: string): LoopSortMap {
  const trimmed = text.trim();

  // Check if JSON format
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.racks)) {
        return {
          name: parsed.name || 'Custom Map',
          level: parsed.level ? Number(parsed.level) : undefined,
          description: parsed.description,
          racks: parsed.racks.map((r: any) => ({
            id: String(r.id),
            name: r.name || `Rack ${r.id}`,
            section: r.section === 'top_shelf' ? 'top_shelf' : 'loop_track',
            capacity: Number(r.capacity) || 4,
            blocks: Array.isArray(r.blocks)
              ? r.blocks.map((b: string) => normalizeColor(b))
              : [],
            iceLockedBy: r.iceLockedBy || r.ice_locked_by,
            ropeTiedTo: r.ropeTiedTo || r.rope_tied_to,
            allowedColors: Array.isArray(r.allowedColors || r.allowed_colors)
              ? (r.allowedColors || r.allowed_colors).map((c: string) =>
                  normalizeColor(c),
                )
              : undefined,
            isConstruction: Boolean(r.isConstruction || r.construction),
            targetColor:
              r.targetColor || r.target_color
                ? normalizeColor(r.targetColor || r.target_color)
                : undefined,
            adjacentIds: Array.isArray(r.adjacentIds || r.adjacent_to)
              ? (r.adjacentIds || r.adjacent_to).map(String)
              : undefined,
          })),
          boxes: Array.isArray(parsed.boxes)
            ? parsed.boxes.map((b: any) => ({
                id: String(b.id),
                name:
                  b.name || `Box (${normalizeColor(b.color).toUpperCase()})`,
                section: b.section === 'top_shelf' ? 'top_shelf' : 'loop_track',
                color: normalizeColor(b.color),
                capacity: Number(b.capacity) || 4,
                filled: Number(b.filled) || 0,
                isConstruction: Boolean(b.isConstruction || b.construction),
                hiddenColor:
                  b.hiddenColor || b.hidden_color
                    ? normalizeColor(b.hiddenColor || b.hidden_color)
                    : undefined,
                queueOrder:
                  b.queueOrder !== undefined || b.queue_order !== undefined
                    ? Number(b.queueOrder ?? b.queue_order)
                    : undefined,
              }))
            : [],
        };
      }
    } catch {
      // Fallback to line parser
    }
  }

  // Parse custom key-value text lines
  let name = 'Custom Map';
  let level: number | undefined;
  let description: string | undefined;
  const racks: Rack[] = [];
  const boxes: TargetBox[] = [];

  const lines = text.split('\n');
  let currentSection: 'top_shelf' | 'loop_track' = 'top_shelf';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    // Skip empty lines and full line comments
    if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('//')) {
      const lowerComment = rawLine.toLowerCase();
      if (lowerComment.includes('conveyor') || lowerComment.includes('loop')) {
        currentSection = 'loop_track';
      } else if (
        lowerComment.includes('upper') ||
        lowerComment.includes('top')
      ) {
        currentSection = 'top_shelf';
      }
      continue;
    }

    if (rawLine.startsWith('[') && rawLine.endsWith(']')) {
      const secTag = rawLine.slice(1, -1).toUpperCase();
      if (
        secTag.includes('LOOP') ||
        secTag.includes('TRACK') ||
        secTag.includes('CONVEYOR')
      ) {
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
    let val = rawLine.substring(sepIdx + 1).trim();

    const upperKey = key.toUpperCase();

    if (upperKey === 'NAME') {
      name = val;
      continue;
    }
    if (upperKey === 'LEVEL') {
      level = parseInt(val, 10) || undefined;
      continue;
    }
    if (upperKey === 'DESCRIPTION') {
      description = val;
      continue;
    }

    // Extract inline modifier curly brackets if present: e.g. { ice_locked_by: T1 }
    let modifiers: Record<string, any> = {};
    const modMatch = val.match(/\{([^}]+)\}/);
    if (modMatch) {
      modifiers = parseModifiers(modMatch[1]);
      val = val.replace(/\{[^}]+\}/, '').trim();
    }

    // Check if key starts with BOX or B_
    if (upperKey.startsWith('BOX') || upperKey.startsWith('B_')) {
      // Box line, e.g. BOX_TOP: pink (4) or BOX_L1: yellow
      const colorMatch = val.match(/^([a-zA-Z?]+)(?:\s*\(([0-9]+)\))?/);
      if (colorMatch) {
        const color = normalizeColor(colorMatch[1]);
        const capacity = colorMatch[2]
          ? parseInt(colorMatch[2], 10)
          : modifiers.capacity || 4;
        const boxSec = upperKey.includes('TOP') ? 'top_shelf' : currentSection;

        boxes.push({
          id: key,
          name: `Box (${color.toUpperCase()})`,
          section: boxSec,
          color,
          capacity,
          filled: 0,
          isConstruction: Boolean(
            modifiers.construction || modifiers.isconstruction,
          ),
          hiddenColor:
            modifiers.hiddencolor || modifiers.targetcolor
              ? normalizeColor(modifiers.hiddencolor || modifiers.targetcolor)
              : undefined,
          queueOrder:
            modifiers.queueorder !== undefined
              ? Number(modifiers.queueorder)
              : undefined,
        });
      }
      continue;
    }

    // Otherwise, interpret as Rack definition (e.g. T1: red, pink, grey or empty)
    let blocksStr = val.split(/[,;\s]+/).filter(Boolean);
    if (blocksStr.length === 1 && blocksStr[0].toLowerCase() === 'empty') {
      blocksStr = [];
    }

    const blocks = blocksStr.map((b) => normalizeColor(b));

    const rackSec = key.toUpperCase().startsWith('T')
      ? 'top_shelf'
      : key.toUpperCase().startsWith('L')
        ? 'loop_track'
        : currentSection;

    const capacity = modifiers.capacity
      ? Number(modifiers.capacity)
      : Math.max(4, blocks.length);

    const allowedColors =
      modifiers.allowedcolors || modifiers.colorfilter
        ? (Array.isArray(modifiers.allowedcolors || modifiers.colorfilter)
            ? modifiers.allowedcolors || modifiers.colorfilter
            : [modifiers.allowedcolors || modifiers.colorfilter]
          ).map((c: string) => normalizeColor(c))
        : undefined;

    racks.push({
      id: key,
      name: `Rack ${key}`,
      section: rackSec,
      capacity,
      blocks,
      iceLockedBy:
        modifiers.icelockedby || modifiers.iceadjacent || modifiers.ice,
      ropeTiedTo:
        modifiers.ropetiedto || modifiers.ropetarget || modifiers.rope,
      allowedColors,
      isConstruction: Boolean(
        modifiers.construction || modifiers.isconstruction,
      ),
      targetColor: modifiers.targetcolor
        ? normalizeColor(modifiers.targetcolor)
        : undefined,
      adjacentIds:
        modifiers.adjacentto || modifiers.adjacentids
          ? (Array.isArray(modifiers.adjacentto || modifiers.adjacentids)
              ? modifiers.adjacentto || modifiers.adjacentids
              : [modifiers.adjacentto || modifiers.adjacentids]
            ).map(String)
          : undefined,
    });
  }

  if (racks.length === 0) {
    throw new Error('No racks found in map text file. Please check format.');
  }

  return {
    name,
    level,
    description,
    racks,
    boxes,
  };
}
