import { useEffect, useRef, useState } from 'react';
import { isConvexConfigured } from '@/lib/convexClient';
import { usePresence } from '@/lib/usePresence';

const TOAST_MS = 4000;

function LivePresence({ room }: { room: string }) {
  const { count, joins } = usePresence(room);
  const label = count === 1 ? 'person' : 'people';

  // One-shot join toasts. On first feed we "prime" — mark everything already
  // present as seen (so we never toast pre-existing attendees or our own join).
  // After that, each new id toasts exactly once; a machine returning after its
  // TTL is already known server-side, so it never reappears here.
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const [toasts, setToasts] = useState<string[]>([]);

  useEffect(() => {
    if (!joins) return;
    if (!primed.current) {
      for (const j of joins) seen.current.add(j.id);
      primed.current = true;
      return;
    }
    const fresh = joins.filter((j) => !seen.current.has(j.id));
    if (fresh.length === 0) return;
    for (const j of fresh) seen.current.add(j.id);
    const ids = fresh.map((j) => j.id);
    setToasts((t) => [...t, ...ids]);
    setTimeout(() => {
      setToasts((t) => t.filter((id) => !ids.includes(id)));
    }, TOAST_MS);
  }, [joins]);

  return (
    <>
      <span className="inline-flex items-center gap-2 font-mono text-sm uppercase text-brutalist-cyan">
        <span
          className="inline-block h-2 w-2 animate-pulse rounded-full bg-brutalist-cyan"
          aria-hidden
        />
        👥 {count ?? '—'} {label} here
      </span>

      {toasts.length > 0 && (
        <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
          {toasts.map((id) => (
            <div
              key={id}
              aria-live="polite"
              className="border-2 border-white bg-brutalist-cyan px-4 py-2 font-mono text-sm font-bold uppercase text-black shadow-hard-md"
            >
              👋 Someone joined{count ? ` · ${count} here` : ''}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Live, de-duplicated presence for a room: an inline "👥 N here" badge plus a
 * one-shot toast when a *new* machine joins. Self-guarding — renders nothing
 * when Convex is unconfigured, so it's safe to drop into any page.
 */
export default function PresenceBadge({ room }: { room: string }) {
  if (!isConvexConfigured) return null;
  return <LivePresence room={room} />;
}
