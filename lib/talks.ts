import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { bundleMDX } from 'mdx-bundler';
import type { TalkFrontMatter } from '../types/TalkFrontMatter';
import {
  getRehypePlugins,
  getRemarkPlugins,
  setEsbuildBinaryPath,
} from './mdx';
import { show_drafts } from './utils/showDrafts';

const root = process.cwd();
const talksPath = path.join(root, 'data', 'talks');

function resolveTalkFile(slug: string): string | null {
  const mdxPath = path.join(talksPath, `${slug}.mdx`);
  const mdPath = path.join(talksPath, `${slug}.md`);
  if (fs.existsSync(mdxPath)) return mdxPath;
  if (fs.existsSync(mdPath)) return mdPath;
  return null;
}

export function getTalkSlugs(): string[] {
  if (!fs.existsSync(talksPath)) return [];
  return fs
    .readdirSync(talksPath)
    .filter((file) => /\.(mdx|md)$/.test(file))
    .map((file) => file.replace(/\.(mdx|md)$/, ''));
}

export function getAllTalksFrontMatter(): TalkFrontMatter[] {
  if (!fs.existsSync(talksPath)) return [];

  const talks: TalkFrontMatter[] = [];

  for (const file of fs.readdirSync(talksPath)) {
    if (!/\.(mdx|md)$/.test(file)) continue;

    const source = fs.readFileSync(path.join(talksPath, file), 'utf8');
    const { data } = matter(source);
    const frontmatter = data as TalkFrontMatter;

    if (frontmatter.draft === true && !show_drafts()) continue;

    talks.push({
      ...frontmatter,
      slug: file.replace(/\.(mdx|md)$/, ''),
      date: frontmatter.date ? new Date(frontmatter.date).toISOString() : null,
    });
  }

  return talks.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Compile a single slide's markdown/MDX into a bundled code string that the
 * client renders with `getMDXComponent`. Reuses the same remark/rehype plugin
 * stack as blog posts (minus the table-of-contents collector) so components
 * like <Diagram>, <NoteBlock> and code highlighting work inside slides.
 */
async function compileSlide(source: string): Promise<string> {
  setEsbuildBinaryPath();

  const { code } = await bundleMDX({
    source,
    cwd: path.join(root, 'components'),
    mdxOptions(options) {
      options.remarkPlugins = [
        ...(options.remarkPlugins ?? []),
        ...getRemarkPlugins(),
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

  return code;
}

export type TalkSlide = { code: string; notes: string | null };

export async function getTalkBySlug(
  slug: string,
): Promise<{ frontMatter: TalkFrontMatter; slides: TalkSlide[] } | null> {
  const filePath = resolveTalkFile(slug);
  if (!filePath) return null;

  const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
  const frontmatter = data as TalkFrontMatter;

  // Split the (frontmatter-stripped) body into individual slides on a line
  // containing only `---`. Within a slide, an optional `???` line separates the
  // slide body from speaker notes (shown in Spectacle's presenter mode).
  const chunks = content
    .split(/^---$/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const slides: TalkSlide[] = await Promise.all(
    chunks.map(async (chunk) => {
      const [body, ...noteParts] = chunk.split(/^\?\?\?$/m);
      const notes = noteParts.join('\n').trim();
      const code = await compileSlide(body.trim());
      return { code, notes: notes || null };
    }),
  );

  return {
    frontMatter: {
      ...frontmatter,
      slug,
      date: frontmatter.date ? new Date(frontmatter.date).toISOString() : null,
    },
    slides,
  };
}
