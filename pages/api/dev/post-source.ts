import fs from 'node:fs';
import path from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Local-authoring endpoint: read/write the raw MDX source for a post.
 * Exists ONLY on the dev server — in any other environment it 404s before
 * touching the filesystem, and `next build` tree-shakes the client UI that
 * calls it (components/dev/DevEditor).
 */

const CONTENT_TYPES = ['blog', 'ideas'] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

function resolveSourcePath(type: ContentType, slug: string): string | null {
  const baseDir = path.join(process.cwd(), 'data', type);
  for (const ext of ['.mdx', '.md']) {
    const candidate = path.resolve(baseDir, `${slug}${ext}`);
    // Slugs can be nested (e.g. aws-batch/part-1) but must stay inside baseDir.
    if (!candidate.startsWith(baseDir + path.sep)) return null;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    res.status(404).end();
    return;
  }

  const type = String(req.query.type ?? 'blog') as ContentType;
  const slug = String(req.query.slug ?? '');
  if (!CONTENT_TYPES.includes(type) || !slug) {
    res.status(400).json({ error: 'bad type or slug' });
    return;
  }

  const filePath = resolveSourcePath(type, slug);
  if (!filePath) {
    res.status(404).json({ error: `no source file for ${type}/${slug}` });
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      source: fs.readFileSync(filePath, 'utf8'),
      file: path.relative(process.cwd(), filePath),
    });
    return;
  }

  if (req.method === 'PUT') {
    const source = req.body?.source;
    if (typeof source !== 'string' || source.length === 0) {
      res.status(400).json({ error: 'body must be { source: string }' });
      return;
    }
    fs.writeFileSync(filePath, source, 'utf8');
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', 'GET, PUT');
  res.status(405).end();
}
