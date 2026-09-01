/**
 * A minimal, allocation-light scanner over the SVG strings `project()` returns.
 *
 * It exists because every alternative to `innerHTML` needs the *values* a frame
 * carries, not its markup, and the generators hand over markup. The generator
 * contract guarantees the element list and its document order never change
 * across the loop, so the shape can be learned once from the `t = 0` frame and
 * every later frame is just a flat run of values in the same order.
 *
 * This is deliberately not a general SVG parser. It handles exactly what the
 * generators emit: self-closing and paired tags, double-quoted attributes, no
 * entities inside attribute values, no CDATA, no comments.
 */

export interface Shape {
  /** Tag name per element, in document order. */
  tags: string[];
  /** Attribute names per element, in document order. */
  names: string[][];
  /** Flat index of the first value belonging to element i. */
  offset: number[];
  /** Total number of attribute values across the document. */
  total: number;
}

/** Learn the element/attribute shape of a frame. Called once per generator. */
export function learn(svg: string): Shape {
  const tags: string[] = [];
  const names: string[][] = [];
  const offset: number[] = [];
  let total = 0;
  walk(svg, (tag, attrNames) => {
    tags.push(tag);
    names.push(attrNames);
    offset.push(total);
    total += attrNames.length;
  });
  return { tags, names, offset, total };
}

/**
 * Fill `out` with every attribute value in the frame, flat and in document
 * order. Returns the number written, which must equal `shape.total` — a
 * mismatch means the generator broke the constant-mark guarantee and every
 * strategy below is invalid for it.
 */
export function scanInto(svg: string, out: string[]): number {
  let n = 0;
  const len = svg.length;
  let i = 0;
  while (i < len) {
    const lt = svg.indexOf('<', i);
    if (lt < 0) break;
    const c = svg.charCodeAt(lt + 1);
    // 47 '/', 63 '?', 33 '!'
    if (c === 47 || c === 63 || c === 33) {
      i = svg.indexOf('>', lt) + 1;
      continue;
    }
    i = lt + 1;
    // tag name
    while (i < len) {
      const ch = svg.charCodeAt(i);
      if (ch === 32 || ch === 62 || ch === 47) break;
      i++;
    }
    // attributes
    while (i < len) {
      const ch = svg.charCodeAt(i);
      if (ch === 62) {
        i++;
        break;
      }
      if (ch === 32 || ch === 47) {
        i++;
        continue;
      }
      // name
      const eq = svg.indexOf('=', i);
      if (eq < 0) {
        i = len;
        break;
      }
      const q = svg.indexOf('"', eq);
      const end = svg.indexOf('"', q + 1);
      out[n++] = svg.slice(q + 1, end);
      i = end + 1;
    }
  }
  return n;
}

function walk(svg: string, emit: (tag: string, names: string[]) => void): void {
  const len = svg.length;
  let i = 0;
  while (i < len) {
    const lt = svg.indexOf('<', i);
    if (lt < 0) break;
    const c = svg.charCodeAt(lt + 1);
    if (c === 47 || c === 63 || c === 33) {
      i = svg.indexOf('>', lt) + 1;
      continue;
    }
    i = lt + 1;
    const nameStart = i;
    while (i < len) {
      const ch = svg.charCodeAt(i);
      if (ch === 32 || ch === 62 || ch === 47) break;
      i++;
    }
    const tag = svg.slice(nameStart, i);
    const names: string[] = [];
    while (i < len) {
      const ch = svg.charCodeAt(i);
      if (ch === 62) {
        i++;
        break;
      }
      if (ch === 32 || ch === 47) {
        i++;
        continue;
      }
      const eq = svg.indexOf('=', i);
      if (eq < 0) {
        i = len;
        break;
      }
      names.push(svg.slice(i, eq).trim());
      const q = svg.indexOf('"', eq);
      const end = svg.indexOf('"', q + 1);
      i = end + 1;
    }
    emit(tag, names);
  }
}
