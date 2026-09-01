/**
 * The query-string contract for `/experiments/backgrounds`.
 *
 * This is the fixture layer for the visual regression suite, so it has to be
 * boringly reliable: a malformed param must not blank the page, and a link
 * written today must still resolve after the controls are rearranged.
 */
import { describe, expect, it } from 'vitest';
import {
  buildGraphicsUrl,
  GRAPHICS_URL_DEFAULTS,
  parseGraphicsUrl,
} from '../lib/graphicsUrl';

describe('parseGraphicsUrl', () => {
  it('returns the defaults for an empty query', () => {
    expect(parseGraphicsUrl({})).toEqual({
      ...GRAPHICS_URL_DEFAULTS,
      theme: undefined,
      paper: undefined,
      group: undefined,
      accent: undefined,
      accents: undefined,
    });
  });

  it('reads every numeric control', () => {
    const s = parseGraphicsUrl({
      seed: '42',
      density: '0.9',
      opacity: '0.4',
      contrast: '1.6',
      disorder: '0.3',
      speed: '0.5',
      fps: '12',
      originX: '0.25',
      originY: '0.8',
      t: '0.37',
    });
    expect(s).toMatchObject({
      seed: 42,
      density: 0.9,
      opacity: 0.4,
      contrast: 1.6,
      disorder: 0.3,
      speed: 0.5,
      fps: 12,
      originX: 0.25,
      originY: 0.8,
      t: 0.37,
    });
  });

  it('clamps rather than trusting, so a hand-edited URL cannot break rendering', () => {
    const s = parseGraphicsUrl({
      density: '9',
      opacity: '-4',
      fps: '900',
      t: '2',
    });
    expect(s.density).toBe(1);
    expect(s.opacity).toBe(0.05);
    expect(s.fps).toBe(60);
    expect(s.t).toBe(1);
  });

  it('falls back on nonsense rather than propagating NaN', () => {
    // A NaN reaching a generator is a frame of `NaN` coordinates, which renders
    // as nothing at all — the worst kind of failure to debug from a screenshot.
    const s = parseGraphicsUrl({ density: 'abc', seed: '', contrast: 'null' });
    expect(s.density).toBe(GRAPHICS_URL_DEFAULTS.density);
    expect(s.seed).toBe(GRAPHICS_URL_DEFAULTS.seed);
    expect(s.contrast).toBe(GRAPHICS_URL_DEFAULTS.contrast);
  });

  it('accepts colours with or without the hash', () => {
    expect(parseGraphicsUrl({ accent: 'ec4899' }).accent).toBe('#ec4899');
    expect(parseGraphicsUrl({ accent: '#EC4899' }).accent).toBe('#ec4899');
    expect(parseGraphicsUrl({ accent: 'nope' }).accent).toBeUndefined();
  });

  it('reads a ramp, dropping members it cannot parse', () => {
    expect(parseGraphicsUrl({ accents: 'ec4899,facc15' }).accents).toEqual([
      '#ec4899',
      '#facc15',
    ]);
    expect(parseGraphicsUrl({ accents: 'zzz' }).accents).toBeUndefined();
  });

  it('treats an absent paper param as "follow the theme"', () => {
    // Distinct from `paper=0`, which is a caller insisting on the dark surface
    // even in a light theme. Collapsing the two would make the light theme
    // impossible to override.
    expect(parseGraphicsUrl({}).paper).toBeUndefined();
    expect(parseGraphicsUrl({ paper: '0' }).paper).toBe(false);
    expect(parseGraphicsUrl({ paper: '1' }).paper).toBe(true);
  });

  it('accepts the words people actually type for booleans', () => {
    for (const off of ['0', 'false', 'no', 'off', 'FALSE']) {
      expect(parseGraphicsUrl({ chrome: off }).chrome).toBe(false);
    }
    expect(parseGraphicsUrl({ chrome: '1' }).chrome).toBe(true);
  });

  it('ignores an unknown theme rather than forcing a broken one', () => {
    expect(parseGraphicsUrl({ theme: 'neon' }).theme).toBeUndefined();
    expect(parseGraphicsUrl({ theme: 'sketch' }).theme).toBe('sketch');
  });

  it('reads a generator list', () => {
    expect(parseGraphicsUrl({ only: 'contour, ridgeline ,' }).only).toEqual([
      'contour',
      'ridgeline',
    ]);
  });
});

describe('buildGraphicsUrl', () => {
  it('omits everything at its default, so a plain link stays plain', () => {
    expect(buildGraphicsUrl({ ...GRAPHICS_URL_DEFAULTS })).toBe(
      '/experiments/backgrounds',
    );
  });

  it('round-trips through the parser', () => {
    const state = {
      ...GRAPHICS_URL_DEFAULTS,
      theme: 'sketch' as const,
      paper: true,
      only: ['contour', 'ridgeline'],
      accent: '#dc2626',
      accents: ['#2563eb', '#dc2626'],
      seed: 42,
      density: 0.8,
      t: 0.25,
      playing: false,
      chrome: false,
      cols: 3,
    };
    const url = buildGraphicsUrl(state);
    const query = Object.fromEntries(
      new URLSearchParams(url.split('?')[1] ?? ''),
    );
    expect(parseGraphicsUrl(query)).toEqual({ ...state, group: undefined });
  });

  it('drops the hash from colours, and the parser puts it back', () => {
    // It is legal in a query value and survives copy-paste and shell quoting
    // badly, which is exactly what these links get used for.
    const url = buildGraphicsUrl({ accent: '#ec4899' });
    expect(url).toContain('accent=ec4899');
    expect(url).not.toContain('%23');
  });
});
