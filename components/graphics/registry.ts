import { SAMPLED_GENERATORS } from './generators';
import {
  BASE_PARAMS,
  type Generator,
  type GraphicParams,
  type SampledGenerator,
} from './types';

/** Per-generator metadata + default params (merged over BASE_PARAMS). */
const META: Record<
  string,
  { label: string; description: string; defaults?: Partial<GraphicParams> }
> = {
  'dot-grid': {
    label: 'Dot Grid',
    description: 'Regular grid of dots with a scatter flaring to full accent.',
    defaults: { density: 0.5 },
  },
  'diagonal-hatch': {
    label: 'Diagonal Hatch',
    description: 'Parallel 45° rules — a few pop, the rest stay ghostly.',
    defaults: { density: 0.55, strokeWidth: 2 },
  },
  'node-network': {
    label: 'Node Network',
    description: 'Constellation of nodes wired to their nearest neighbours.',
    defaults: { density: 0.5 },
  },
  contour: {
    label: 'Contour',
    description: 'Stacked topographic waves with occasional bright bands.',
    defaults: { density: 0.6, strokeWidth: 2 },
  },
  'iso-grid': {
    label: 'Iso Grid',
    description: 'Isometric lattice of diamonds; some cells fill with accent.',
    defaults: { density: 0.5 },
  },
  'scatter-blocks': {
    label: 'Scatter Blocks',
    description: 'Brutalist confetti of rotated squares — outlined to solid.',
    defaults: { density: 0.5 },
  },
  'hex-grid': {
    label: 'Hex Grid',
    description:
      'Honeycomb lit by a wave crossing it; cells breathe with the field.',
    defaults: { density: 0.5 },
  },
  'triangle-grid': {
    label: 'Triangle Grid',
    description:
      'Interlocking triangles, the two orientations driven in antiphase.',
    defaults: { density: 0.5 },
  },
  ridgeline: {
    label: 'Ridgeline',
    description:
      'Layered angular mountains, parallaxing — depth by contrast, not perspective.',
    defaults: { density: 0.55, strokeWidth: 2 },
  },
  'radial-spokes': {
    label: 'Radial Spokes',
    description:
      'Spokes and rings about a centre — the one background with a middle to sit behind.',
    defaults: { density: 0.5, strokeWidth: 1.5 },
  },
  interference: {
    label: 'Interference',
    description:
      'Two-source wave interference as displaced rules; the fringes exist only in the sum.',
    defaults: { density: 0.55, strokeWidth: 2 },
  },
  'flow-field': {
    label: 'Flow Field',
    description:
      'Streamlines swimming along a vector field written as two crossed sines.',
    defaults: { density: 0.5, strokeWidth: 2 },
  },
  'truchet-arcs': {
    label: 'Truchet Arcs',
    description:
      'Quarter-arc tiles that turn — long curves form and break across the frame.',
    defaults: { density: 0.5, strokeWidth: 2 },
  },
  'iso-cubes': {
    // Density is capped lower than the rest by default: cubes are five polygons
    // each, and this is the generator most able to blow the data-URI budget.
    label: 'Iso Cubes',
    description:
      'Stacked cubes on a rolling height field — opaque faces, so depth survives.',
    defaults: { density: 0.4, strokeWidth: 1.5 },
  },
};

export const GENERATOR_LIST: Generator[] = Object.entries(
  SAMPLED_GENERATORS,
).map(([name, generator]) => {
  const g = generator as SampledGenerator<unknown>;
  return {
    name,
    label: META[name]?.label ?? name,
    description: META[name]?.description ?? '',
    defaults: { ...BASE_PARAMS, ...META[name]?.defaults },
    render: (p: GraphicParams) => g.project(g.sample(p), p, p.t ?? 0),
    sample: g.sample,
    project: g.project,
  };
});

const BY_NAME = new Map(GENERATOR_LIST.map((g) => [g.name, g]));

export function getGenerator(name: string): Generator | undefined {
  return BY_NAME.get(name);
}

/** Merge caller params over a generator's defaults into a full param set.
 * `undefined` overrides are dropped so a missing prop (e.g. width) falls back
 * to the default instead of clobbering it with undefined. */
export function resolveParams(
  name: string,
  overrides: Partial<GraphicParams> = {},
): GraphicParams {
  const gen = getGenerator(name);
  const defined = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined),
  );
  return { ...BASE_PARAMS, ...gen?.defaults, ...defined };
}

/** Render a generator to a raw SVG string. Empty string for unknown names. */
export function renderGraphic(
  name: string,
  overrides: Partial<GraphicParams> = {},
): string {
  const gen = getGenerator(name);
  if (!gen) return '';
  return gen.render(resolveParams(name, overrides));
}

/** SVG string → data URI suitable for a CSS `url(...)` background. */
export function graphicDataUri(
  name: string,
  overrides: Partial<GraphicParams> = {},
): string {
  const svg = renderGraphic(name, overrides);
  if (!svg) return '';
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
