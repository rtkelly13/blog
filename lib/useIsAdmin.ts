import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

/**
 * Site-wide admin check. Being signed in as an allowlisted GitHub admin is a
 * global fact (not just an /admin thing), so any surface can call this to reveal
 * admin-only affordances — e.g. draft talks in the listing. Returns false while
 * loading and for non-admins.
 *
 * MUST be called under a ConvexProvider — which only exists when Convex is
 * configured. Callers that can render without a deployment (CI / SSG builds)
 * must gate on `isConvexConfigured` and not render the component that uses this
 * hook; otherwise useQuery throws "Could not find Convex client" at prerender.
 */
export function useIsAdmin(): boolean {
  return useQuery(api.talks.isAdmin, {}) === true;
}
