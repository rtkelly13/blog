import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function CVRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/about');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center font-mono space-y-4">
      <p className="text-zinc-400">Redirecting to About & CV page...</p>
      <a href="/about" className="text-brutalist-cyan underline text-sm">
        Click here if not redirected
      </a>
    </div>
  );
}
