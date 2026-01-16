import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globby } from 'globby';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

async function auditSEO() {
  const blogDir = path.join(root, 'data', 'blog');
  const files = await globby(['**/*.{md,mdx}'], { cwd: blogDir });

  let issuesFound = 0;

  console.log(`Auditing ${files.length} blog posts...\n`);

  files.forEach((file) => {
    const filePath = path.join(blogDir, file);
    const source = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(source);

    const issues = [];
    const warnings = [];

    if (!data.title) issues.push('Missing Title');
    if (!data.summary) issues.push('Missing Summary');
    if (!data.date) issues.push('Missing Date');
    if (!data.tags || !Array.isArray(data.tags) || data.tags.length === 0)
      issues.push('Missing or Invalid Tags');

    // Warnings
    if (!data.images || data.images.length === 0)
      warnings.push('No Social Image (images: [])');

    if (issues.length > 0 || warnings.length > 0) {
      if (issues.length > 0) issuesFound++;

      console.log(`\x1b[1m${file}\x1b[0m ${data.draft ? '(DRAFT)' : ''}`);
      issues.forEach((i) => console.log(`  \x1b[31m✖\x1b[0m ${i}`));
      warnings.forEach((w) => console.log(`  \x1b[33m⚠\x1b[0m ${w}`));
      console.log('');
    }
  });

  if (issuesFound > 0) {
    console.log(
      `\x1b[31mAudit failed with ${issuesFound} problematic posts.\x1b[0m`,
    );
    process.exit(1);
  } else {
    console.log('\x1b[32mSEO Audit Passed! All posts look good.\x1b[0m');
  }
}

auditSEO();
