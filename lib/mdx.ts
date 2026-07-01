import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { bundleMDX } from 'mdx-bundler';
import readingTime from 'reading-time';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypePrismPlus from 'rehype-prism-plus';
// Rehype packages
import rehypeSlug from 'rehype-slug';
// Remark packages
import remarkGfm from 'remark-gfm';
import { remarkAlert } from 'remark-github-blockquote-alert';
import remarkMath from 'remark-math';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import type { Toc } from 'types/Toc';
import type { Pluggable } from 'unified';
import { visit } from 'unist-util-visit';
import remarkCodeTitles from './remark-code-title';
import remarkTocHeadings from './remark-toc-headings';
import getAllFilesRecursively from './utils/files';
import { show_drafts } from './utils/showDrafts';

const root = process.cwd();

const tokenClassNames = {
  tag: 'text-code-red',
  'attr-name': 'text-code-yellow',
  'attr-value': 'text-code-green',
  deleted: 'text-code-red',
  inserted: 'text-code-green',
  punctuation: 'text-code-white',
  keyword: 'text-code-purple',
  string: 'text-code-green',
  function: 'text-code-blue',
  boolean: 'text-code-red',
  comment: 'text-gray-400 italic',
};

export function setEsbuildBinaryPath() {
  // https://github.com/kentcdodds/mdx-bundler#nextjs-esbuild-enoent
  if (process.platform === 'win32') {
    process.env.ESBUILD_BINARY_PATH = path.join(
      process.cwd(),
      'node_modules',
      'esbuild',
      'esbuild.exe',
    );
  } else {
    process.env.ESBUILD_BINARY_PATH = path.join(
      process.cwd(),
      'node_modules',
      'esbuild',
      'bin',
      'esbuild',
    );
  }
}

/**
 * Remark plugins shared across all MDX compilation (blog posts and talk slides).
 * Pass a `toc` ref to collect a table of contents; omit it for content that
 * doesn't need one (e.g. individual slides).
 */
export function getRemarkPlugins(toc?: Toc): Pluggable[] {
  return [
    ...(toc ? [[remarkTocHeadings, { exportRef: toc }] as Pluggable] : []),
    remarkGfm,
    remarkCodeTitles,
    remarkMath,
    remarkAlert,
  ];
}

/**
 * Rehype plugins shared across all MDX compilation. Includes the Prism token
 * class-name remapper that powers the brutalist code highlighting.
 */
export function getRehypePlugins(): Pluggable[] {
  return [
    rehypeSlug,
    rehypeAutolinkHeadings,
    rehypeKatex,
    [rehypePrismPlus, { ignoreMissing: true }] as Pluggable,
    (() => {
      return (tree: any) => {
        visit(tree, 'element', (node: any) => {
          const [token, type] = node.properties.className || [];
          if (token === 'token') {
            node.properties.className = [tokenClassNames[type]];
          }
        });
      };
    }) as Pluggable,
  ];
}

export function getFiles(type: 'blog' | 'authors' | 'series') {
  const prefixPaths = path.join(root, 'data', type);
  const files = getAllFilesRecursively(prefixPaths);
  return files.map((file) =>
    file.slice(prefixPaths.length + 1).replace(/\\/g, '/'),
  );
}

export function formatSlug(slug: string) {
  return slug.replace(/\.(mdx|md)/, '');
}

export function dateSortDesc(a: string, b: string) {
  if (a > b) return -1;
  if (a < b) return 1;
  return 0;
}

export function sortPosts(a: PostFrontMatter, b: PostFrontMatter) {
  const dateCompare = dateSortDesc(a.date, b.date);

  // If dates are different, sort by date
  if (dateCompare !== 0) return dateCompare;

  // If dates are the same and both have series info, sort by series order
  if (a.series && b.series && a.series.name === b.series.name) {
    return a.series.order - b.series.order;
  }

  // If only one has series info, prioritize series posts
  if (a.series && !b.series) return -1;
  if (!a.series && b.series) return 1;

  // Default to alphabetical by title
  return a.title.localeCompare(b.title);
}

export async function getFileBySlug<_T>(
  type: 'authors' | 'blog' | 'series',
  slug: string | string[],
) {
  const mdxPath = path.join(root, 'data', type, `${slug}.mdx`);
  const mdPath = path.join(root, 'data', type, `${slug}.md`);
  const source = fs.existsSync(mdxPath)
    ? fs.readFileSync(mdxPath, 'utf8')
    : fs.readFileSync(mdPath, 'utf8');

  setEsbuildBinaryPath();

  const toc: Toc = [];

  const { frontmatter, code } = await bundleMDX({
    source,
    // mdx imports can be automatically source from the components directory
    cwd: path.join(process.cwd(), 'components'),
    mdxOptions(options) {
      options.remarkPlugins = [
        ...(options.remarkPlugins ?? []),
        ...getRemarkPlugins(toc),
      ];
      options.rehypePlugins = [
        ...(options.rehypePlugins ?? []),
        ...getRehypePlugins(),
      ];
      return options;
    },
    esbuildOptions: (options) => {
      options.loader = {
        ...options.loader,
        '.js': 'jsx',
      };
      return options;
    },
  });

  return {
    mdxSource: code,
    toc,
    frontMatter: {
      readingTime: readingTime(code),
      slug: slug || null,
      fileName: fs.existsSync(mdxPath) ? `${slug}.mdx` : `${slug}.md`,
      ...frontmatter,
      date: frontmatter.date ? new Date(frontmatter.date).toISOString() : null,
    },
  };
}

export async function getAllFilesFrontMatter(folder: 'blog') {
  const prefixPaths = path.join(root, 'data', folder);

  const files = getAllFilesRecursively(prefixPaths);

  const allFrontMatter: PostFrontMatter[] = [];

  files.forEach((file: string) => {
    // Replace is needed to work on Windows
    const fileName = file.slice(prefixPaths.length + 1).replace(/\\/g, '/');
    // Remove Unexpected File
    if (path.extname(fileName) !== '.md' && path.extname(fileName) !== '.mdx') {
      return;
    }
    const source = fs.readFileSync(file, 'utf8');
    const matterFile = matter(source);
    const frontmatter = matterFile.data as PostFrontMatter;
    if (
      ('draft' in frontmatter && frontmatter.draft !== true) ||
      show_drafts()
    ) {
      allFrontMatter.push({
        ...frontmatter,
        slug: formatSlug(fileName),
        date: frontmatter.date
          ? new Date(frontmatter.date).toISOString()
          : null,
        fileName,
        readingTime: readingTime(matterFile.content),
      });
    }
  });

  return allFrontMatter.sort(sortPosts);
}
