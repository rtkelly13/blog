/**
 * Which routes search engines are allowed to index.
 *
 * Single source of truth, shared by the runtime (`pages/_app.tsx` emits the
 * `robots` meta from it) and the build (`scripts/generate-sitemap.mjs` filters
 * against it). Keeping one list is the point: a page that is noindexed must not
 * also be advertised in the sitemap, and that only stays true if both sides read
 * the same rules.
 *
 * `.mjs` so the build scripts can import it directly; `routePolicy.ts`
 * re-exports for TS consumers (same trick as `lib/utils/showDrafts`).
 */

/**
 * Route prefixes excluded from search results.
 *
 * - `/admin`, `/live/manage` — presenter/author surfaces behind an auth gate.
 * - `/design-sandbox`, `/experiments/<page>` — internal design proofs and
 *   prototypes. The `/experiments` index itself is real content, hence the
 *   trailing slash on the prefix.
 * - `/ideas` — the admin-gated pre-drafting workbench. Its contents are
 *   explicitly working material, not published prose (docs/posting.md).
 */
export const NOINDEX_PREFIXES = [
  '/admin',
  '/live/manage',
  '/cv',
  '/design-sandbox',
  '/experiments/',
  '/ideas',
];

/**
 * Route patterns excluded from search results.
 *
 * The presenter view of a talk is a fullscreen deck — same content as the talk
 * page it belongs to, so indexing it would only compete with the real page.
 */
export const NOINDEX_PATTERNS = [/^\/talks\/[^/]+\/present$/];

/** True when `route` should carry `noindex` and stay out of the sitemap. */
export function isNoIndexRoute(route) {
  // Ignore query strings and hashes — indexing policy is per-path.
  const path = route.split(/[?#]/)[0].replace(/\/$/, '') || '/';

  const matchesPrefix = (prefix) =>
    // A prefix ending in `/` matches subpaths only (so `/experiments/` covers
    // `/experiments/graphics` but not the `/experiments` index). Otherwise match
    // the route itself or anything nested under it — never a route that merely
    // starts with the same characters.
    prefix.endsWith('/')
      ? path.startsWith(prefix)
      : path === prefix || path.startsWith(`${prefix}/`);

  if (NOINDEX_PREFIXES.some(matchesPrefix)) return true;
  return NOINDEX_PATTERNS.some((pattern) => pattern.test(path));
}
