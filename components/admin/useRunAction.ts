import { useCallback, useState } from 'react';

/**
 * Runs an async admin action (typically a Convex mutation), surfacing any thrown
 * error as `error` and tracking in-flight state as `busy`. Replaces the
 * scattered `.catch(() => {})` calls that silently swallowed failures — most
 * importantly the "Unauthorized: sign in with an allowed GitHub account." that
 * `requireAdmin` throws when a presenter's session lapses mid-talk, which
 * otherwise left dead buttons with no feedback.
 */
export function useRunAction() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Stable identity so effects can list `run` as a dependency without
  // re-registering listeners every render.
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }, []);

  return { run, error, busy };
}
