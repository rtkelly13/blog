import '@fontsource/vt323/400.css';
// Proposal C — Editorial Three-Role typography
// Display: Space Grotesk · Body: Inter · Code/UI: IBM Plex Mono
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import '@fontsource/ibm-plex-mono/700.css';
import '@/css/tailwind.css';

import { ConvexProvider } from 'convex/react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider } from 'next-themes';

import Analytics from '@/components/analytics';
import LayoutWrapper from '@/components/LayoutWrapper';
import SearchProvider from '@/components/search/SearchProvider';
import { convex } from '@/lib/convexClient';

export default function App({ Component, pageProps }: AppProps) {
  const tree = (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <SearchProvider>
        <Head>
          <meta content="width=device-width, initial-scale=1" name="viewport" />
        </Head>
        <Analytics />
        <LayoutWrapper>
          <Component {...pageProps} />
        </LayoutWrapper>
      </SearchProvider>
    </ThemeProvider>
  );

  // Only mount the Convex provider when a deployment is configured. Everything
  // else renders unchanged when NEXT_PUBLIC_CONVEX_URL is unset.
  return convex ? (
    <ConvexProvider client={convex}>{tree}</ConvexProvider>
  ) : (
    tree
  );
}
