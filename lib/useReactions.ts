import { useMutation, useQuery } from 'convex/react';
import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/convex/_generated/api';

// Batch this user's rapid taps: accumulate per-emoji counts and flush one
// mutation per emoji after a short idle gap. Keeps spam off the wire while
// still preserving "I tapped 8 times" as a single count=8 row.
const DEBOUNCE_MS = 600;

export interface ReactionsState {
  recent: { id: string; emoji: string; count: number }[] | undefined;
  react: (emoji: string) => void;
}

export function useReactions(room: string): ReactionsState {
  const send = useMutation(api.reactions.send);
  const recent = useQuery(api.reactions.recent, { room });
  const pending = useRef<Map<string, number>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    for (const [emoji, count] of pending.current) {
      void send({ room, emoji, count });
    }
    pending.current.clear();
    timer.current = null;
  }, [room, send]);

  const react = useCallback(
    (emoji: string) => {
      pending.current.set(emoji, (pending.current.get(emoji) ?? 0) + 1);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush],
  );

  // Flush anything pending on unmount so a quick tap-then-leave still lands.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        flush();
      }
    };
  }, [flush]);

  return { recent, react };
}
