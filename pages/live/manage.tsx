import { useRouter } from 'next/router';
import { useEffect } from 'react';

// The presenter controls now live on the memorable /admin hub. Keep this path
// working (muscle memory / old links) with a client-side redirect.
export default function LiveManageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin');
  }, [router]);
  return null;
}
