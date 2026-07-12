import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { IdeaFrontMatter } from '../types/IdeaFrontMatter';
import { formatSlug } from './mdx';

const root = process.cwd();
const ideasPath = path.join(root, 'data', 'ideas');

/**
 * All ideas in `data/ideas/`, most recently touched first. There is no draft
 * filter: every idea is inherently unpublished working material — the /ideas
 * pages that render them sit behind the admin gate instead.
 */
export function getAllIdeasFrontMatter(): IdeaFrontMatter[] {
  if (!fs.existsSync(ideasPath)) return [];

  const ideas: IdeaFrontMatter[] = [];
  for (const file of fs.readdirSync(ideasPath)) {
    if (path.extname(file) !== '.mdx' && path.extname(file) !== '.md') {
      continue;
    }
    const source = fs.readFileSync(path.join(ideasPath, file), 'utf8');
    const frontmatter = matter(source).data as IdeaFrontMatter;
    ideas.push({
      ...frontmatter,
      slug: formatSlug(file),
      fileName: file,
    });
  }

  return ideas.sort((a, b) => {
    const at = new Date(a.updated ?? a.created ?? 0).getTime();
    const bt = new Date(b.updated ?? b.created ?? 0).getTime();
    return bt - at;
  });
}
