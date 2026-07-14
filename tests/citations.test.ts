import { bundleMDX } from 'mdx-bundler';
import { describe, expect, it } from 'vitest';
import {
  getRehypePlugins,
  getRemarkPlugins,
  setEsbuildBinaryPath,
} from '../lib/mdx';

const bibliography = 'references-data.bib';

async function render(source: string, options?: { bibliography?: string }) {
  setEsbuildBinaryPath();
  const { code } = await bundleMDX({
    source,
    mdxOptions(mdxOptions) {
      mdxOptions.remarkPlugins = [
        ...(mdxOptions.remarkPlugins ?? []),
        ...getRemarkPlugins(),
      ];
      mdxOptions.rehypePlugins = [
        ...(mdxOptions.rehypePlugins ?? []),
        ...getRehypePlugins(options),
      ];
      return mdxOptions;
    },
  });
  return code;
}

describe('rehype-citation pipeline', () => {
  it('resolves [@BibKey] citations and appends a bibliography', async () => {
    const code = await render('As shown in [@Nash1950], equilibria exist.', {
      bibliography,
    });
    // In-text citation rendered from the .bib entry, not left as raw syntax.
    expect(code).toContain('Nash');
    expect(code).toContain('1950');
    expect(code).not.toContain('[@Nash1950]');
    // Reference list appended at the end of the document.
    expect(code).toContain('Equilibrium points in n-person games');
  });

  it('leaves posts without a bibliography untouched', async () => {
    const code = await render('Plain post, no citations.');
    expect(code).toContain('Plain post, no citations.');
    expect(code).not.toContain('csl');
  });
});
