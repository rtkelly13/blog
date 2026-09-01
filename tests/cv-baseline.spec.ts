import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test.describe('CV Pipeline & Artifact Baseline Tests', () => {
  const rootDir = path.resolve(__dirname, '..');
  const cvPdfPath = path.join(rootDir, 'public/cv.pdf');
  const templateTexPath = path.join(rootDir, 'cv/template.tex');
  const aboutProfilePath = path.join(rootDir, 'data/about/profile.json');

  test('cv.pdf exists and is non-empty', async () => {
    expect(fs.existsSync(cvPdfPath)).toBe(true);
    const stat = fs.statSync(cvPdfPath);
    // XeLaTeX compiled cv.pdf should be between 25KB and 150KB
    expect(stat.size).toBeGreaterThan(25000);
    expect(stat.size).toBeLessThan(150000);
  });

  test('cv/template.tex is generated from data/about/ and contains Principal Software Engineer', async () => {
    expect(fs.existsSync(templateTexPath)).toBe(true);
    const content = fs.readFileSync(templateTexPath, 'utf8');
    expect(content).toContain('Principal Software Engineer');
    expect(content).toContain('94ryan.kelly@gmail.com');
    expect(content).toContain('Sentric Music');
  });

  test('about page links to valid downloadable cv.pdf', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('domcontentloaded');

    const downloadLink = page.locator('a[href="/cv.pdf"]');
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toHaveAttribute('download', 'Ryan_Kelly_CV.pdf');
  });

  test('projects page displays Parquet.SourceGenerator and Parquet.TypeProvider', async ({
    page,
  }) => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Parquet.SourceGenerator')).toBeVisible();
    await expect(page.locator('text=Parquet.TypeProvider')).toBeVisible();
  });
});
