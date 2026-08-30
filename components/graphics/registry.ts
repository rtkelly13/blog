import { GENERATOR_MODULES } from './generators';
import {
  BASE_PARAMS,
  type Generator,
  type GeneratorGroup,
  type GraphicParams,
} from './types';

/**
 * The public face of the generator modules.
 *
 * Everything here is *derived*. There used to be a `META` table in this file
 * holding labels, descriptions and defaults for generators implemented
 * somewhere else, which meant adding one required edits in three places and
 * missing the third was silent. Metadata now lives in the module, so this file
 * only adapts and indexes.
 */
export const GENERATOR_LIST: Generator[] = GENERATOR_MODULES.map((m) => ({
  name: m.name,
  label: m.label,
  description: m.description,
  group: m.group,
  speed: m.speed ?? 1,
  defaults: { ...BASE_PARAMS, ...m.defaults },
  render: (p: GraphicParams) => m.project(m.sample(p), p, p.t ?? 0),
  sample: m.sample,
  project: m.project,
}));

const BY_NAME = new Map(GENERATOR_LIST.map((g) => [g.name, g]));

export function getGenerator(name: string): Generator | undefined {
  return BY_NAME.get(name);
}

/** Generators in one family, in registry order. For grouped galleries. */
export function generatorsInGroup(group: GeneratorGroup): Generator[] {
  return GENERATOR_LIST.filter((g) => g.group === group);
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
