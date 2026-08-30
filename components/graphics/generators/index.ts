import type { GeneratorModule } from '../types';
import brokenRing from './broken-ring';
import contour from './contour';
import diagonalHatch from './diagonal-hatch';
import dotGrid from './dot-grid';
import flowField from './flow-field';
import flowLines from './flow-lines';
import hexGrid from './hex-grid';
import interference from './interference';
import isoCubes from './iso-cubes';
import isoGrid from './iso-grid';
import nodeNetwork from './node-network';
import orbitRings from './orbit-rings';
import radialSpokes from './radial-spokes';
import ridgeline from './ridgeline';
import scatterBlocks from './scatter-blocks';
import triangleGrid from './triangle-grid';
import truchetArcs from './truchet-arcs';

/**
 * Every generator, in gallery order.
 *
 * ## Adding one
 *
 * 1. Create `./<name>.ts`, default-exporting `defineGenerator({ … })`. The
 *    filename must equal the module's `name` — a conformance test asserts it,
 *    so a typo fails the build rather than producing a generator nobody can
 *    address by id.
 * 2. Add two lines here: the import, and an entry below.
 *
 * That is the whole procedure. Metadata lives in the module beside the code, so
 * there is no third place to forget. `registry.ts` derives everything else, and
 * every gallery, the Remotion renderer and the test suite iterate this array —
 * so a new generator is animated, tested against the full coherence contract,
 * and rendered everywhere without touching any of them.
 *
 * Order is presentation only. `GENERATOR_GROUPS` in `../types.ts` is what
 * galleries group by.
 */
export const GENERATOR_MODULES: GeneratorModule<unknown>[] = [
  dotGrid,
  diagonalHatch,
  nodeNetwork,
  contour,
  isoGrid,
  scatterBlocks,
  hexGrid,
  triangleGrid,
  ridgeline,
  radialSpokes,
  interference,
  flowField,
  truchetArcs,
  isoCubes,
  flowLines,
  brokenRing,
  orbitRings,
] as GeneratorModule<unknown>[];

/** Back-compat shape: id → the sample/project pair. */
export const SAMPLED_GENERATORS = Object.fromEntries(
  GENERATOR_MODULES.map((m) => [
    m.name,
    { sample: m.sample, project: m.project },
  ]),
);

export type GeneratorName = string;
