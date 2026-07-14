import Link from 'next/link';
import { useRouter } from 'next/router';
import { useIsAdmin } from '@/lib/useIsAdmin';

/**
 * Small persistent "you're an admin" marker, shown site-wide once signed in as an
 * allowlisted GitHub admin — a visual counterpart to the fact that admin status
 * is now global (see useIsAdmin). Links to the admin hub. Hidden for everyone
 * else. Must be mounted inside the Convex provider.
 */
export default function AdminIndicator() {
  const isAdmin = useIsAdmin();
  const router = useRouter();

  // Never overlay the badge on a projected deck — attendee/presenter views are
  // shown to the room, so the audience would see it. The presenter console
  // (mode=console) is a private 2nd screen, so the badge stays there. The deck
  // defaults to attendee when no mode is set, so treat "not console" as hidden.
  const onDeck = router.pathname === '/talks/[slug]/present';
  const hiddenOnProjectedDeck = onDeck && router.query.mode !== 'console';

  if (!isAdmin || hiddenOnProjectedDeck) return null;
  return (
    <Link
      href="/admin"
      title="Admin — you can see drafts"
      style={{
        position: 'fixed',
        bottom: '0.6rem',
        left: '0.6rem',
        zIndex: 60,
        border: '2px solid var(--brutalist-cyan, #22d3ee)',
        background: 'var(--color-black, #000)',
        color: 'var(--brutalist-cyan, #22d3ee)',
        padding: '0.15rem 0.5rem',
        fontFamily: 'var(--font-ibm-plex-mono, "IBM Plex Mono"), monospace',
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        opacity: 0.75,
        textDecoration: 'none',
      }}
    >
      ● Admin
    </Link>
  );
}
