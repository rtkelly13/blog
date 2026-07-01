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

/**
 * A talk is published unless it explicitly sets `draft: true`. Drafts are shown
 * in development (SHOW_DRAFTS). Applied to slug enumeration, detail loading, and
 * the listing so draft talks never leak into the production static build.
 */
function isPublished(frontmatter: { draft?: boolean }): boolean {
  return frontmatter.draft !== true || show_drafts();
}

function normalizeFrontMatter(
  data: TalkFrontMatter,
  slug: string,
): TalkFrontMatter {
  return {
    ...data,
    slug,
    date: data.date ? new Date(data.date).toISOString() : null,
  };
}

/**
 * Split a talk body (frontmatter already stripped) into slide chunks on lines
 * that contain only `---`. Fenced code blocks (``` / ~~~) are tracked so a
 * `---` line *inside* a code sample never splits a slide. Authors who want a
 * horizontal rule within a single slide should use `***` or `___`.
 */
function splitSlides(content: string): string[] {
  const chunks: string[][] = [[]];
  let fence: string | null = null;

  for (const line of content.split('\n')) {
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch) {
      const marker = fenceMatch[1].startsWith('~') ? '~~~' : '```';
      if (!fence) fence = marker;
      else if (fence === marker) fence = null;
    } else if (!fence && line.trim() === '---') {
      chunks.push([]);
      continue;
    }
    chunks[chunks.length - 1].push(line);
  }

  return chunks.map((chunk) => chunk.join('\n').trim()).filter(Boolean);
}

export function getAllTalksFrontMatter(): TalkFrontMatter[] {
  if (!fs.existsSync(talksPath)) return [];

  const talks: TalkFrontMatter[] = [];

  for (const file of fs.readdirSync(talksPath)) {
    if (!/\.(mdx|md)$/.test(file)) continue;

    const { data } = matter(
      fs.readFileSync(path.join(talksPath, file), 'utf8'),
    );
    const frontmatter = data as TalkFrontMatter;

    if (!isPublished(frontmatter)) continue;

    talks.push(
      normalizeFrontMatter(frontmatter, file.replace(/\.(mdx|md)$/, '')),
    );
  }

  return talks.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Published talk slugs only. Derived from getAllTalksFrontMatter so the draft
 * filter lives in exactly one place (getStaticPaths must not enumerate drafts).
 */
export function getTalkSlugs(): string[] {
  return getAllTalksFrontMatter().map((talk) => talk.slug);
}

/** Shared getStaticPaths body for the talk landing + present routes. */
export function getTalkStaticPaths() {
  return {
    paths: getTalkSlugs().map((slug) => ({ params: { slug } })),
    fallback: false as const,
  };
}

/**
 * Lightweight metadata (front matter + slide count) without compiling any MDX —
 * used by the landing page, which only needs the count. Returns null for a
 * missing or draft (in production) talk.
 */
export function getTalkMeta(
  slug: string,
): { frontMatter: TalkFrontMatter; slideCount: number } | null {
  const filePath = resolveTalkFile(slug);
  if (!filePath) return null;

  const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
  const frontmatter = data as TalkFrontMatter;
  if (!isPublished(frontmatter)) return null;

  return {
    frontMatter: normalizeFrontMatter(frontmatter, slug),
    slideCount: splitSlides(content).length,
  };
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

export type TalkSlide = {
  code: string;
  /** Raw notes markdown — a compact text preview in the presenter console. */
  notes: string | null;
  /** Compiled notes MDX — rendered (formatted) in Spectacle's presenter view. */
  notesCode: string | null;
};

export async function getTalkBySlug(
  slug: string,
): Promise<{ frontMatter: TalkFrontMatter; slides: TalkSlide[] } | null> {
  const filePath = resolveTalkFile(slug);
  if (!filePath) return null;

  const { data, content } = matter(fs.readFileSync(filePath, 'utf8'));
  const frontmatter = data as TalkFrontMatter;
  if (!isPublished(frontmatter)) return null;

  // Split the (frontmatter-stripped) body into individual slides. Within a
  // slide, an optional `???` line separates the slide body from speaker notes
  // (shown in Spectacle's presenter mode). Both body and notes are compiled
  // through the same MDX pipeline so formatting renders identically.
  const chunks = splitSlides(content);

  const slides: TalkSlide[] = await Promise.all(
    chunks.map(async (chunk) => {
      const [body, ...noteParts] = chunk.split(/^\?\?\?$/m);
      const notes = noteParts.join('\n').trim();
      const [code, notesCode] = await Promise.all([
        compileSlide(body.trim()),
        notes ? compileSlide(notes) : Promise.resolve(null),
      ]);
      return { code, notes: notes || null, notesCode };
    }),
  );

  return {
    frontMatter: normalizeFrontMatter(frontmatter, slug),
    slides,
  };
}
