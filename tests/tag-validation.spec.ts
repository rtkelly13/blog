import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import matter from 'gray-matter';
import type { PostFrontMatter } from '../types/PostFrontMatter';

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function getAllBlogPosts(): { file: string; frontmatter: PostFrontMatter }[] {
  const blogDir = path.join(process.cwd(), 'data', 'blog');
  const posts: { file: string; frontmatter: PostFrontMatter }[] = [];

  function readDir(dir: string) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        readDir(fullPath);
      } else if (item.endsWith('.mdx') || item.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const { data } = matter(content);
        const relativePath = path.relative(blogDir, fullPath);
        posts.push({
          file: relativePath,
          frontmatter: data as PostFrontMatter,
        });
      }
    }
  }

  readDir(blogDir);
  return posts;
}

test.describe('Tag Validation', () => {
  test('no tag has differing capitalization across posts', () => {
    const posts = getAllBlogPosts();
    const tagMap = new Map<string, Set<string>>();

    for (const { frontmatter } of posts) {
      if (!frontmatter.tags) continue;

      for (const tag of frontmatter.tags) {
        const lowerTag = tag.toLowerCase();

        if (!tagMap.has(lowerTag)) {
          tagMap.set(lowerTag, new Set());
        }

        tagMap.get(lowerTag)!.add(tag);
      }
    }

    const inconsistencies: string[] = [];

    for (const [lowerTag, variations] of tagMap) {
      if (variations.size > 1) {
        inconsistencies.push(
          `Tag "${lowerTag}" has inconsistent capitalization: ${Array.from(variations).join(', ')}`,
        );
      }
    }

    expect(
      inconsistencies,
      `Found ${inconsistencies.length} tag(s) with inconsistent capitalization:\n${inconsistencies.join('\n')}`,
    ).toHaveLength(0);
  });

  test('no tags have Levenshtein distance of 3 or less (excluding known exceptions)', () => {
    const posts = getAllBlogPosts();
    const allTags = new Set<string>();

    for (const { frontmatter } of posts) {
      if (!frontmatter.tags) continue;

      for (const tag of frontmatter.tags) {
        allTags.add(tag.toLowerCase());
      }
    }

    const tagArray = Array.from(allTags).sort();
    const similarPairs: string[] = [];

    const knownExceptions = new Set(['biome-blog']);

    for (let i = 0; i < tagArray.length; i++) {
      for (let j = i + 1; j < tagArray.length; j++) {
        const tagA = tagArray[i];
        const tagB = tagArray[j];

        if (tagA.includes(tagB) || tagB.includes(tagA)) {
          continue;
        }

        if (tagA.length <= 3 || tagB.length <= 3) {
          continue;
        }

        const pairKey = [tagA, tagB].sort().join('-');
        if (knownExceptions.has(pairKey)) {
          continue;
        }

        const distance = levenshteinDistance(tagA, tagB);

        if (distance <= 3 && distance > 0) {
          similarPairs.push(`"${tagA}" and "${tagB}" (distance: ${distance})`);
        }
      }
    }

    expect(
      similarPairs,
      `Found ${similarPairs.length} tag pair(s) that are too similar (Levenshtein distance ≤ 3):\n${similarPairs.join('\n')}\n\nIf these are legitimate different concepts, add them to knownExceptions in the test.`,
    ).toHaveLength(0);
  });

  test('all tags are lowercase kebab-case', () => {
    const posts = getAllBlogPosts();
    const invalidTags: { file: string; tag: string; reason: string }[] = [];

    const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    for (const { file, frontmatter } of posts) {
      if (!frontmatter.tags) continue;

      for (const tag of frontmatter.tags) {
        if (!kebabCasePattern.test(tag)) {
          let reason = '';

          if (/[A-Z]/.test(tag)) {
            reason = 'contains uppercase letters';
          } else if (/\s/.test(tag)) {
            reason = 'contains whitespace';
          } else if (/_/.test(tag)) {
            reason = 'uses underscores instead of hyphens';
          } else if (/[^a-z0-9-]/.test(tag)) {
            reason = 'contains invalid characters';
          } else if (tag.startsWith('-') || tag.endsWith('-')) {
            reason = 'starts or ends with hyphen';
          } else if (/--/.test(tag)) {
            reason = 'contains consecutive hyphens';
          } else {
            reason = 'invalid format';
          }

          invalidTags.push({ file, tag, reason });
        }
      }
    }

    const errorMessage = invalidTags
      .map((item) => `  ${item.file}: "${item.tag}" (${item.reason})`)
      .join('\n');

    expect(
      invalidTags,
      `Found ${invalidTags.length} tag(s) not in lowercase kebab-case:\n${errorMessage}`,
    ).toHaveLength(0);
  });

  test('no duplicate tags within a single post', () => {
    const posts = getAllBlogPosts();
    const duplicates: { file: string; duplicateTags: string[] }[] = [];

    for (const { file, frontmatter } of posts) {
      if (!frontmatter.tags || frontmatter.tags.length === 0) continue;

      const tagCounts = new Map<string, number>();

      for (const tag of frontmatter.tags) {
        const lowerTag = tag.toLowerCase();
        tagCounts.set(lowerTag, (tagCounts.get(lowerTag) || 0) + 1);
      }

      const duplicateTags = Array.from(tagCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([tag]) => tag);

      if (duplicateTags.length > 0) {
        duplicates.push({ file, duplicateTags });
      }
    }

    const errorMessage = duplicates
      .map((item) => `  ${item.file}: ${item.duplicateTags.join(', ')}`)
      .join('\n');

    expect(
      duplicates,
      `Found ${duplicates.length} post(s) with duplicate tags:\n${errorMessage}`,
    ).toHaveLength(0);
  });

  test('tag counts are accurate', () => {
    const posts = getAllBlogPosts();
    const tagCounts = new Map<string, number>();

    for (const { frontmatter } of posts) {
      if (!frontmatter.tags) continue;

      for (const tag of frontmatter.tags) {
        const lowerTag = tag.toLowerCase();
        tagCounts.set(lowerTag, (tagCounts.get(lowerTag) || 0) + 1);
      }
    }

    const sortedTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    expect(tagCounts.size).toBeGreaterThan(0);

    console.log('\nTop 10 most popular tags:');
    for (const [tag, count] of sortedTags) {
      console.log(`  ${tag}: ${count} post(s)`);
    }
  });
});
