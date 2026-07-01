import { useEffect, useRef, useState } from 'react';
import { isConvexConfigured } from '@/lib/convexClient';
import { useReactions } from '@/lib/useReactions';

// Mirrors the server allow-list (convex/reactions.ts). Kept here so the client
// bundle doesn't import server code.
const EMOJIS = ['👍', '❤️', '😂', '🎉', '👏', '🔥'];
const MAX_BUBBLES_PER_BATCH = 12;

interface Bubble {
  key: string;
  emoji: string;
  left: number;
  delay: number;
}

function LiveReactions({ room }: { room: string }) {
  const { recent, react } = useReactions(room);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    if (!recent) return;
    if (!primed.current) {
      for (const r of recent) seen.current.add(r.id);
      primed.current = true;
      return;
    }
    const fresh = recent.filter((r) => !seen.current.has(r.id));
    if (fresh.length === 0) return;

    const spawned: Bubble[] = [];
    for (const r of fresh) {
      seen.current.add(r.id);
      const n = Math.min(r.count, MAX_BUBBLES_PER_BATCH);
      for (let i = 0; i < n; i++) {
        spawned.push({
          key: `${r.id}-${i}`,
          emoji: r.emoji,
          left: Math.random() * 80,
          delay: i * 120,
        });
      }
    }
    setBubbles((b) => [...b, ...spawned]);
    const keys = new Set(spawned.map((s) => s.key));
    setTimeout(() => {
      setBubbles((b) => b.filter((x) => !keys.has(x.key)));
    }, 4000);
  }, [recent]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            aria-label={`React ${emoji}`}
            className="border-2 border-white bg-zinc-900 px-3 py-2 text-xl transition-transform hover:bg-zinc-800 active:translate-y-0.5"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Floating reactions — bottom-right 20% of the viewport. */}
      <div className="reaction-stream pointer-events-none fixed right-0 bottom-0 z-40 h-[45vh] w-[20vw] overflow-hidden">
        {bubbles.map((b) => (
          <span
            key={b.key}
            className="reaction-bubble absolute bottom-0"
            style={{ left: `${b.left}%`, animationDelay: `${b.delay}ms` }}
          >
            {b.emoji}
          </span>
        ))}
      </div>
    </>
  );
}

/**
 * Emoji reaction bar + floating-bubble stream for a room. Taps are debounced
 * per user (see useReactions) and validated against an allow-list server-side.
 * Self-guarding — renders nothing without Convex.
 */
export default function Reactions({ room }: { room: string }) {
  if (!isConvexConfigured) return null;
  return <LiveReactions room={room} />;
}
