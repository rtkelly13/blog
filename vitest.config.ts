import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
      '**/blog-upgrade.spec.ts',
      '**/experiments.spec.ts',
    ],
  },
});
