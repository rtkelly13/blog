import { describe, expect, it } from 'vitest';
import { buildHeaderSvg, HEADER_PRESETS } from '../lib/og/headerImage.mjs';

const base = {
  title: 'The Virtual Monorepo: Giving Coding Agents One World',
  slug: 'virtual-monorepo-coding-agents',
  tags: ['ai', 'coding-agents', 'monorepo'],
  date: '2026-07-04',
};

describe('buildHeaderSvg', () => {
  it('is deterministic — same input yields identical output', () => {
    expect(buildHeaderSvg(base)).toBe(buildHeaderSvg(base));
  });

  it('varies by seed (slug)', () => {
    // Omit date so the eyebrow reflects the slug — this guarantees a diff
    // regardless of how many themes the seed happens to bucket into.
    const a = buildHeaderSvg({ ...base, date: undefined, slug: 'one' });
    const b = buildHeaderSvg({ ...base, date: undefined, slug: 'two' });
    expect(a).not.toBe(b);
  });

  it('emits a well-formed standalone SVG at the requested size', () => {
    const svg = buildHeaderSvg({ ...base, ...HEADER_PRESETS.og });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
  });

  it('exposes banner and og presets', () => {
    expect(HEADER_PRESETS.banner).toEqual({ width: 1200, height: 600 });
    expect(HEADER_PRESETS.og).toEqual({ width: 1200, height: 630 });
  });

  it('handles missing tags and date without throwing', () => {
    const svg = buildHeaderSvg({ title: 'Solo', slug: 'solo' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  // Safety: the output is injected via dangerouslySetInnerHTML, so it must never
  // contain executable or event-handler markup, and front-matter text must be
  // XML-escaped rather than interpolated raw.
  describe('is safe to inline', () => {
    it('contains no script or event-handler markup', () => {
      const svg = buildHeaderSvg(base);
      expect(svg).not.toMatch(/<script/i);
      expect(svg).not.toMatch(/\son\w+=/i); // onload=, onclick=, ...
      expect(svg).not.toMatch(/javascript:/i);
    });

    it('escapes angle brackets, ampersands and quotes in the title', () => {
      const svg = buildHeaderSvg({
        ...base,
        title: '<script>alert("x")</script> & \'more\'',
      });
      // The raw injection must not survive into the markup...
      expect(svg).not.toContain('<script>alert');
      // ...it must appear escaped instead.
      expect(svg).toContain('&lt;script&gt;');
      expect(svg).toContain('&amp;');
      expect(svg).toContain('&quot;');
      expect(svg).toContain('&#39;');
      // And the document is still a single well-formed SVG.
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
    });

    it('escapes malicious tag values too', () => {
      const svg = buildHeaderSvg({ ...base, tags: ['<img src=x onerror=1>'] });
      expect(svg).not.toContain('<img src=x');
      expect(svg).toContain('&lt;img');
    });
  });
});
