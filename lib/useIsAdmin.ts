import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

/**
 * Site-wide admin check. Being signed in as an allowlisted GitHub admin is a
 * global fact (not just an /admin thing), so any surface can call this to reveal
 * admin-only affordances — e.g. draft talks in the listing. Returns false when
 * Convex isn't configured, while loading, or for non-admins.
 */
export function useIsAdmin(): boolean {
  const isAdmin = useQuery(api.talks.isAdmin, isConvexConfigured ? {} : 'skip');
  return isAdmin === true;
}
