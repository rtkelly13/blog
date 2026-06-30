import { defineConfig, devices } from '@playwright/test';

/**
 * Config for the "local build vs deployed main" regression suite.
 *
 * Kept separate from playwright.config.ts because this suite:
 *   - talks to the live production site (network required),
 *   - is NOT platform-gated (it diffs two same-machine renders), and
 *   - should not run as part of the normal `pnpm test:e2e` sweep.
 *
 * Run via `pnpm test:regression`.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /visual-vs-deployed\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /* Boot the local production build so it can be compared against deployed main. */
  webServer: {
    command: 'pnpm run serve',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
