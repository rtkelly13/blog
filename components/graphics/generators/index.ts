import type { GeneratorModule } from '../types';
import brockmannArcs from './brockmann-arcs';
import brokenRing from './broken-ring';
import cellMask from './cell-mask';
import contour from './contour';
import cubeHelix from './cube-helix';
import diagonalHatch from './diagonal-hatch';
import dotGrid from './dot-grid';
import flowField from './flow-field';
import flowLines from './flow-lines';
import hexGrid from './hex-grid';
import interference from './interference';
import isoBlocks from './iso-blocks';
import isoCubes from './iso-cubes';
import isoGrid from './iso-grid';
import isoTerrain from './iso-terrain';
import kaleidoscope from './kaleidoscope';
import lineCircles from './line-circles';
import nodeNetwork from './node-network';
import orbitRings from './orbit-rings';
import phyllotaxis from './phyllotaxis';
import polarMesh from './polar-mesh';
import radialDashes from './radial-dashes';
import radialSpokes from './radial-spokes';
import resonance from './resonance';
import ribbonGrid from './ribbon-grid';
import ridgeline from './ridgeline';
import ripple from './ripple';
import roseCurve from './rose-curve';
import scatterBlocks from './scatter-blocks';
import signalDecay from './signal-decay';
import spiralDots from './spiral-dots';
import spiralMesh from './spiral-mesh';
import spiralWarp from './spiral-warp';
import sweptPolygons from './swept-polygons';
import terrainMesh from './terrain-mesh';
import triangleGrid from './triangle-grid';
import truchetArcs from './truchet-arcs';
import truchetMirror from './truchet-mirror';
import truchetSingle from './truchet-single';
import voidField from './void-field';
import weave from './weave';

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
/**
 * Removed: `lissajous`.
 *
 * A field of Lissajous figures, adapted from the reference set's
 * `lissajous_field`. It satisfied every contract — the loop closed natively,
 * because integer frequency ratios make a Lissajous curve close on itself, and
 * that property was genuinely the nicest thing about it.
 *
 * It never worked as a *background*. Two rounds of rework got it from a contact
 * sheet of isolated specimens to a set of overlapping curves running off the
 * frame, and it still read as a collection of individual figures rather than as
 * a field — each one a discrete object with a silhouette the eye picks out and
 * follows, which is exactly what a backdrop must not do. The others in this set
 * work because no single mark asks for attention; a Lissajous figure is all
 * mark. Worth knowing before anyone adapts it again: the problem is the form,
 * not the tuning.
 *
 * `components/graphics/generators/lissajous.ts` was deleted in the same commit;
 * recover it from history if the reasoning above ever looks wrong.
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
  kaleidoscope,
  phyllotaxis,
  polarMesh,
  terrainMesh,
  spiralMesh,
  roseCurve,
  weave,
  signalDecay,
  voidField,
  spiralWarp,
  ribbonGrid,
  cellMask,
  cubeHelix,
  sweptPolygons,
  truchetSingle,
  truchetMirror,
  radialDashes,
  brockmannArcs,
  lineCircles,
  resonance,
  ripple,
  isoTerrain,
  isoBlocks,
  spiralDots,
] as GeneratorModule<unknown>[];

/** Back-compat shape: id → the sample/project pair. */
export const SAMPLED_GENERATORS = Object.fromEntries(
  GENERATOR_MODULES.map((m) => [
    m.name,
    { sample: m.sample, project: m.project },
  ]),
);

export type GeneratorName = string;
