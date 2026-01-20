import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'data', 'blog');

function getAllBlogFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllBlogFiles(fullPath));
    } else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

test.describe('Blog Frontmatter Validation', () => {
  const blogFiles = getAllBlogFiles(BLOG_DIR);

  test('all blog posts have required frontmatter fields', () => {
    const errors: string[] = [];

    for (const filePath of blogFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      const fileName = path.relative(BLOG_DIR, filePath);

      const requiredFields = ['title', 'date', 'tags', 'summary'];
      for (const field of requiredFields) {
        if (!(field in data)) {
          errors.push(`${fileName}: missing required field "${field}"`);
        }
      }

      if ('title' in data && typeof data.title !== 'string') {
        errors.push(`${fileName}: "title" must be a string`);
      }

      if ('summary' in data && typeof data.summary !== 'string') {
        errors.push(`${fileName}: "summary" must be a string`);
      }

      if ('tags' in data && !Array.isArray(data.tags)) {
        errors.push(`${fileName}: "tags" must be an array`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Frontmatter validation failed:\n${errors.join('\n')}`);
    }
  });

  test('posts with series must have order field', () => {
    const errors: string[] = [];

    for (const filePath of blogFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      const fileName = path.relative(BLOG_DIR, filePath);

      if (data.series) {
        if (typeof data.series !== 'object') {
          errors.push(`${fileName}: "series" must be an object`);
          continue;
        }

        if (!('name' in data.series)) {
          errors.push(`${fileName}: series must have "name" field`);
        }

        if (!('order' in data.series)) {
          errors.push(`${fileName}: series must have "order" field`);
        }

        if ('order' in data.series && typeof data.series.order !== 'number') {
          errors.push(`${fileName}: series.order must be a number`);
        }

        if ('order' in data.series && data.series.order < 0) {
          errors.push(
            `${fileName}: series.order must be non-negative (got ${data.series.order})`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Series validation failed:\n${errors.join('\n')}`);
    }
  });

  test('post titles must not duplicate series name', () => {
    const errors: string[] = [];

    for (const filePath of blogFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      const fileName = path.relative(BLOG_DIR, filePath);

      if (data.series && data.title) {
        const seriesName = data.series.name;
        const title = data.title.toLowerCase();

        if (title.includes(seriesName.toLowerCase())) {
          errors.push(
            `${fileName}: title contains series name ("${data.title}" contains "${seriesName}")`,
          );
        }

        const partPattern = /\(part\s*\d+\)/i;
        if (partPattern.test(data.title)) {
          errors.push(
            `${fileName}: title contains "(Part N)" suffix - use series.order instead`,
          );
        }

        const colonPattern = new RegExp(`^${seriesName}:`, 'i');
        if (colonPattern.test(data.title)) {
          errors.push(
            `${fileName}: title starts with "${seriesName}:" - remove series prefix`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Title validation failed:\n${errors.join('\n')}`);
    }
  });

  test('series order numbers are sequential within each series', () => {
    const seriesMap = new Map<string, Array<{ order: number; file: string }>>();

    for (const filePath of blogFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      const fileName = path.relative(BLOG_DIR, filePath);

      if (data.series && typeof data.series.order === 'number') {
        const seriesName = data.series.name;
        if (!seriesMap.has(seriesName)) {
          seriesMap.set(seriesName, []);
        }
        seriesMap.get(seriesName)!.push({
          order: data.series.order,
          file: fileName,
        });
      }
    }

    const errors: string[] = [];

    for (const [seriesName, posts] of seriesMap.entries()) {
      const sortedPosts = posts.sort((a, b) => a.order - b.order);
      const orders = sortedPosts.map((p) => p.order);

      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        const duplicates = orders.filter(
          (order, idx) => orders.indexOf(order) !== idx,
        );
        errors.push(
          `Series "${seriesName}" has duplicate order numbers: ${[...new Set(duplicates)].join(', ')}`,
        );
      }

      const expectedOrders = Array.from({ length: orders.length }, (_, i) =>
        i === 0 ? orders[0] : orders[0] + i,
      );
      if (JSON.stringify(orders) !== JSON.stringify(expectedOrders)) {
        errors.push(
          `Series "${seriesName}" has non-sequential order numbers. Expected: [${expectedOrders.join(', ')}], Got: [${orders.join(', ')}]`,
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(`Series order validation failed:\n${errors.join('\n')}`);
    }
  });

  test('dates are in valid ISO format', () => {
    const errors: string[] = [];

    for (const filePath of blogFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      const fileName = path.relative(BLOG_DIR, filePath);

      if (data.date) {
        const date = new Date(data.date);
        if (Number.isNaN(date.getTime())) {
          errors.push(`${fileName}: invalid date format "${data.date}"`);
        }

        if (data.date && !/^\d{4}-\d{2}-\d{2}/.test(data.date.toString())) {
          errors.push(
            `${fileName}: date should be in YYYY-MM-DD format (got "${data.date}")`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Date validation failed:\n${errors.join('\n')}`);
    }
  });

  test('tags are non-empty arrays', () => {
    const errors: string[] = [];

    for (const filePath of blogFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      const fileName = path.relative(BLOG_DIR, filePath);

      if (data.tags) {
        if (!Array.isArray(data.tags)) {
          errors.push(`${fileName}: tags must be an array`);
          continue;
        }

        if (data.tags.length === 0) {
          errors.push(`${fileName}: tags array is empty`);
        }

        for (const tag of data.tags) {
          if (typeof tag !== 'string') {
            errors.push(`${fileName}: all tags must be strings`);
            break;
          }
          if (tag.trim().length === 0) {
            errors.push(`${fileName}: tags contain empty strings`);
            break;
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Tags validation failed:\n${errors.join('\n')}`);
    }
  });

  test('draft field is boolean when present', () => {
    const errors: string[] = [];

    for (const filePath of blogFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(content);
      const fileName = path.relative(BLOG_DIR, filePath);

      if ('draft' in data && typeof data.draft !== 'boolean') {
        errors.push(
          `${fileName}: "draft" must be a boolean (got ${typeof data.draft})`,
        );
      }
    }

    if (errors.length > 0) {
      throw new Error(`Draft validation failed:\n${errors.join('\n')}`);
    }
  });
});
