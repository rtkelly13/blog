import { useQuery } from 'convex/react';
import type { ReactNode } from 'react';
import { api } from '@/convex/_generated/api';
import { isConvexConfigured } from '@/lib/convexClient';

function Resolver({
  room,
  children,
}: {
  room?: string;
  children: (room: string) => ReactNode;
}) {
  const current = useQuery(api.talks.current, room ? 'skip' : {});
  const resolved = room ?? current?.room;
  if (!resolved) return null;
  return <>{children(resolved)}</>;
}

/**
 * Shared shell for the embedded live-talk widgets (Q&A, poll, ordered-actions,
 * emoji board). Renders nothing when Convex is unconfigured; otherwise resolves
 * the room — the explicit `room` prop if given, else the current live talk's —
 * and hands it to `children`, rendering nothing until a room resolves.
 *
 * Centralising this keeps every embed's room-resolution and configured-guard
 * behaviour identical (a loading state, talk-ended case, or skip rule now lives
 * in one place instead of four verbatim copies).
 */
export function ResolvedRoom({
  room,
  children,
}: {
  room?: string;
  children: (room: string) => ReactNode;
}) {
  if (!isConvexConfigured) return null;
  return <Resolver room={room}>{children}</Resolver>;
}
