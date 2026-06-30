import { ConvexReactClient } from 'convex/react';

// The Convex deployment URL is injected at build time. It is intentionally
// optional: the rest of the site (and CI builds) must work without a Convex
// deployment configured. When it is unset, `convex` is null and the audience
// activity pages render a "not configured" notice instead of crashing.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

export const isConvexConfigured = Boolean(convexUrl);

export const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;
