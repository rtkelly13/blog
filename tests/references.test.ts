import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { extractReferences } from '../lib/references';
import remarkReferences, {
  buildReference,
  toArchiveUrl,
} from '../lib/remark-references';
import type { Reference } from '../types/Reference';

function runPlugin(
  markdown: string,
  insertMarkers = false,
  meta?: { manualPlacement: boolean },
) {
  const references: Reference[] = [];
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdx)
    .use(remarkGfm)
    .use(remarkReferences, { exportRef: references, insertMarkers, meta });
  const tree = processor.runSync(processor.parse(markdown)) as any;
  return { references, tree };
}

describe('remarkReferences', () => {
  it('collects external links in order of first appearance', () => {
    const { references } = runPlugin(
      'See [Next.js](https://nextjs.org/docs) and [MDN](https://developer.mozilla.org/en-US/).',
    );
    expect(references).toHaveLength(2);
    expect(references[0]).toMatchObject({
      id: 'ref-1',
      number: 1,
      title: 'Next.js',
      url: 'https://nextjs.org/docs',
      domain: 'nextjs.org',
    });
    expect(references[1].number).toBe(2);
    expect(references[1].domain).toBe('developer.mozilla.org');
  });

  it('deduplicates repeated URLs under one number', () => {
    const { references } = runPlugin(
      '[first](https://example.com/a) then [again](https://example.com/a) and [other](https://example.com/b)',
    );
    expect(references.map((r) => r.number)).toEqual([1, 2]);
    expect(references[0].title).toBe('first'); // first occurrence wins
  });

  it('ignores internal links, anchors, and mailto', () => {
    const { references } = runPlugin(
      '[post](/blog/foo) [anchor](#section) [mail](mailto:a@b.com) [ext](https://example.com)',
    );
    expect(references).toHaveLength(1);
    expect(references[0].url).toBe('https://example.com');
  });

  it('uses the domain as title for bare autolinks', () => {
    const { references } = runPlugin('Go to https://www.example.com/page now.');
    expect(references[0].title).toBe('example.com');
    expect(references[0].domain).toBe('example.com');
  });

  it('builds a Wayback Machine archive URL for every reference', () => {
    const { references } = runPlugin('[x](https://example.com/a?b=c)');
    expect(references[0].archiveUrl).toBe(
      'https://web.archive.org/web/https://example.com/a?b=c',
    );
  });

  it('inserts [n] citation markers after external links when enabled', () => {
    const { tree } = runPlugin(
      '[Next.js](https://nextjs.org) is great. [Next.js](https://nextjs.org) again.',
      true,
    );
    const paragraph = tree.children[0];
    const markers = paragraph.children.filter(
      (node: any) => node.type === 'link' && node.url?.startsWith('#ref-'),
    );
    expect(markers).toHaveLength(2);
    expect(markers[0].children[0].value).toBe('[1]');
    expect(markers[1].children[0].value).toBe('[1]'); // same URL, same number
    // Only the first marker carries the backlink anchor id.
    expect(markers[0].data.hProperties.id).toBe('cite-1');
    expect(markers[1].data.hProperties.id).toBeUndefined();
  });

  it('does not insert markers into headings', () => {
    const { tree, references } = runPlugin(
      '## See [docs](https://example.com/docs)',
      true,
    );
    const heading = tree.children[0];
    expect(references).toHaveLength(0);
    const markers = heading.children.filter(
      (node: any) => node.type === 'link' && node.url?.startsWith('#ref-'),
    );
    expect(markers).toHaveLength(0);
  });

  it('skips malformed URLs without crashing', () => {
    expect(buildReference('https://', 'broken', 1)).toBeNull();
  });

  it('gives each marker a hover tooltip with the full entry', () => {
    const { tree } = runPlugin(
      '[AWS Batch](https://aws.amazon.com/batch/) is a service.',
      true,
    );
    const marker = tree.children[0].children.find(
      (node: any) => node.type === 'link' && node.url?.startsWith('#ref-'),
    );
    expect(marker.data.hProperties.title).toBe(
      '[1] AWS Batch — aws.amazon.com',
    );
  });

  it('flags manual placement when the body renders <References />', () => {
    const meta = { manualPlacement: false };
    runPlugin('Intro [x](https://example.com)\n\n<References />\n', true, meta);
    expect(meta.manualPlacement).toBe(true);
  });

  it('leaves manualPlacement false when no <References /> is present', () => {
    const meta = { manualPlacement: false };
    runPlugin('Just [x](https://example.com) here.', true, meta);
    expect(meta.manualPlacement).toBe(false);
  });
});

describe('toArchiveUrl', () => {
  it('points at the latest Wayback snapshot', () => {
    expect(toArchiveUrl('https://example.com')).toBe(
      'https://web.archive.org/web/https://example.com',
    );
  });
});

describe('extractReferences', () => {
  it('extracts references from a full MDX talk body', () => {
    const source = [
      '# Slide one',
      '',
      'Read [the docs](https://example.com/docs)',
      '',
      '---',
      '',
      '<LivePoll prompt="q" />',
      '',
      'Also [a paper](https://arxiv.org/abs/1234.5678)',
      '',
      '???',
      '',
      'Speaker notes with [a link](https://example.org/notes)',
    ].join('\n');
    const refs = extractReferences(source);
    expect(refs.map((r) => r.url)).toEqual([
      'https://example.com/docs',
      'https://arxiv.org/abs/1234.5678',
      'https://example.org/notes',
    ]);
    expect(refs.map((r) => r.number)).toEqual([1, 2, 3]);
  });

  it('falls back to plain markdown when MDX parsing fails', () => {
    // `<1 and` is invalid JSX — the strict MDX parser throws on it.
    const source = 'Broken <1 and [link](https://example.com)';
    const refs = extractReferences(source);
    expect(refs).toHaveLength(1);
    expect(refs[0].url).toBe('https://example.com');
  });

  it('returns an empty list for content without external links', () => {
    expect(extractReferences('Just [internal](/blog/x) text.')).toEqual([]);
  });
});
