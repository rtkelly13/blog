import { useMutation, useQuery } from 'convex/react';
import { useEffect } from 'react';
import { api } from '@/convex/_generated/api';
import { getMachineId } from './machineId';

const HEARTBEAT_MS = 10_000;

export interface PresenceState {
  /** Live, de-duplicated count of machines currently present. */
  count: number | undefined;
  /** First-time joins in the recent window — for one-shot "joined" toasts. */
  joins: { id: string; at: number }[] | undefined;
}

/**
 * Heartbeat into a presence room and subscribe to its live head-count plus the
 * recent first-join feed. One heartbeat per caller — render a single <Presence>
 * per room. Only call where ConvexProvider is mounted (behind an
 * `isConvexConfigured` guard).
 */
export function usePresence(room: string): PresenceState {
  const heartbeat = useMutation(api.presence.heartbeat);
  const count = useQuery(api.presence.count, { room });
  const joins = useQuery(api.presence.recentJoins, { room });

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

  return { count, joins };
}
