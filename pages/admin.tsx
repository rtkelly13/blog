import dynamic from 'next/dynamic';
import { PageSEO } from '@/components/SEO';
import siteMetadata from '@/data/siteMetadata';

// The cockpit is entirely Convex/auth-driven, so render it client-only. The
// page shell (heading) still prerenders; the dashboard never touches SSR.
const AdminDashboard = dynamic(
  () => import('@/components/admin/AdminDashboard'),
  {
    ssr: false,
    loading: () => <p className="font-mono text-zinc-400">Loading admin…</p>,
  },
);

export default function AdminPage() {
  return (
    <>
      <PageSEO title={`Admin - ${siteMetadata.author}`} description="" />
      <article className="mx-auto max-w-4xl py-10">
        <h1 className="mb-6 font-display text-3xl font-bold uppercase text-white">
          [ Admin ]
        </h1>
        <AdminDashboard />
      </article>
    </>
  );
}
