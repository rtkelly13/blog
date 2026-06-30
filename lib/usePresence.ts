import { useMutation, useQuery } from 'convex/react';
import { useEffect } from 'react';
import { api } from '@/convex/_generated/api';

const STORAGE_KEY = 'rk:machine-id';
const HEARTBEAT_MS = 10_000;

/**
 * Pseudo-anonymous machine id: a random UUID kept in localStorage. No PII, not a
 * real hardware id — it just de-duplicates this browser profile's tabs/reloads.
 * Falls back to a per-session id if storage is unavailable (private mode etc.).
 */
function getMachineId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `ephemeral-${crypto.randomUUID()}`;
  }
}

/**
 * Heartbeat into a presence room and subscribe to its live, de-duplicated
 * head-count. Only call this where ConvexProvider is mounted (i.e. behind an
 * `isConvexConfigured` guard) — see PresenceBadge.
 */
export function usePresence(room: string): number | undefined {
  const heartbeat = useMutation(api.presence.heartbeat);
  const count = useQuery(api.presence.count, { room });

  useEffect(() => {
    const machineId = getMachineId();
    const beat = () => {
      void heartbeat({ room, machineId });
    };
    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    // Beat again when the tab regains focus so a re-opened laptop counts fast.
    const onVisible = () => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [room, heartbeat]);

  return count;
}
