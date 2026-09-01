/**
 * Browser-side entry for the rendering benchmark. Bundled by `run.mjs` with
 * esbuild and loaded by `harness.html`.
 */
import {
  GENERATOR_LIST,
  getGenerator,
  resolveParams,
} from '../../components/graphics/registry';
import { gallery, run, show, useInstancingMicro } from './driver';
import { STRATEGIES } from './strategies';

// biome-ignore lint/suspicious/noExplicitAny: benchmark glue
(globalThis as any).BENCH = {
  run,
  gallery,
  show,
  useInstancingMicro,
  strategies: STRATEGIES.map((s) => ({ name: s.name, blurb: s.blurb })),
  getGenerator,
  resolveParams,
  names: GENERATOR_LIST.map((g) => g.name),
};
