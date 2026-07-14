import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      // json-summary feeds scripts/ci/coverage-delta.mjs; lcov is for external
      // viewers; text prints the table in the CI log.
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['components/**', 'lib/**', 'layouts/**'],
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/e2e.spec.ts',
      '**/visual.spec.ts',
      '**/visual-responsive.spec.ts',
      '**/responsive.spec.ts',
      '**/feeds.spec.ts',
      '**/scroll-buttons.spec.ts',
      '**/reading-time.spec.ts',
      '**/experiments.spec.ts',
    ],
    projects: [
      {
        // Plain Node unit tests (lib + convex pure helpers). Because `projects`
        // is defined, root-level tests don't run on their own — this project is
        // what actually executes `tests/**/*.test.ts`.
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
        },
      },
      {
        // Convex function tests via convex-test: exercise the real query/
        // mutation handlers against an in-memory backend. Needs the edge
        // runtime (per Convex's testing guidelines) and convex-test inlined so
        // its import.meta.glob module map resolves. Colocated in convex/.
        extends: true,
        test: {
          name: 'convex',
          environment: 'edge-runtime',
          include: ['convex/**/*.test.ts'],
          server: { deps: { inline: ['convex-test'] } },
          // requireAdmin reads this at module load; set it so the tests can
          // mint an allowlisted identity (see convex/authz.test.ts).
          env: { ADMIN_GITHUB_LOGINS: 'rtkelly13' },
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
  },
});
