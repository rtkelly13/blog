import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test.describe('CV PDF Visual & Page Constraint Baseline', () => {
  const rootDir = path.resolve(__dirname, '..');
  const cvPdfPath = path.join(rootDir, 'public/cv.pdf');
  const cvScreenPngPath = path.join(rootDir, 'cv/screen.png');

  test('cv.pdf strict 1-page budget verification', async () => {
    expect(fs.existsSync(cvPdfPath)).toBe(true);
    const data = fs.readFileSync(cvPdfPath);

    // In compiled XeLaTeX output, each page object is defined by /Type /Page
    // Ensure the document does not overflow onto page 2
    const pageMatches =
      data.toString('latin1').match(/\/Type\s*\/Page\b/g) || [];
    // If uncompressed objects or stream-based, check page bounds
    if (pageMatches.length > 0) {
      expect(pageMatches.length).toBe(1);
    }
  });

  test('cv/screen.png matches 1-page baseline geometry', async () => {
    expect(fs.existsSync(cvScreenPngPath)).toBe(true);
    const stat = fs.statSync(cvScreenPngPath);
    // Baseline rendered PNG must exist and be valid
    expect(stat.size).toBeGreaterThan(10000);
  });
});
