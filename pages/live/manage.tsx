import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

// The presenter controls now live on the memorable /admin hub. Keep this path
// working (muscle memory / old links) with a client-side redirect.
export default function LiveManageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin');
  }, [router]);
  return (
    // A client-side redirect leaves a real, crawlable page behind. It renders no
    // SEO component, so spell out the tag that `lib/seo/routePolicy.mjs` implies.
    <Head>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
  );
}
