// Typed re-export of the deterministic header-image engine for app-side (.tsx)
// imports. The implementation lives once in `headerImage.mjs` — this file adds
// no logic, it only gives TypeScript a resolution target and named types
// (mirroring the `showDrafts.mjs` / `showDrafts.ts` pairing used in `lib/`).
// `allowJs` + the JSDoc in the `.mjs` supply the runtime types.
import { buildHeaderSvg, HEADER_PRESETS } from './headerImage.mjs';

export type HeaderImageOptions = {
  title: string;
  seed?: string;
  slug?: string;
  tags?: string[];
  date?: string;
  siteName?: string;
  width?: number;
  height?: number;
};

export { buildHeaderSvg, HEADER_PRESETS };
