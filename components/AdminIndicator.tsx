import Link from 'next/link';
import { useIsAdmin } from '@/lib/useIsAdmin';

/**
 * Small persistent "you're an admin" marker, shown site-wide once signed in as an
 * allowlisted GitHub admin — a visual counterpart to the fact that admin status
 * is now global (see useIsAdmin). Links to the admin hub. Hidden for everyone
 * else. Must be mounted inside the Convex provider.
 */
export default function AdminIndicator() {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <Link
      href="/admin"
      title="Admin — you can see drafts"
      style={{
        position: 'fixed',
        bottom: '0.6rem',
        left: '0.6rem',
        zIndex: 60,
        border: '2px solid #22d3ee',
        background: '#000',
        color: '#22d3ee',
        padding: '0.15rem 0.5rem',
        fontFamily: '"IBM Plex Mono", monospace',
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
