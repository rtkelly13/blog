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
import type { ReactElement, ReactNode } from 'react';

import Analytics from '@/components/analytics';
import LayoutWrapper from '@/components/LayoutWrapper';
import SearchProvider from '@/components/search/SearchProvider';
import { convex } from '@/lib/convexClient';

type NextPageWithLayout = AppProps['Component'] & {
  getLayout?: (page: ReactElement) => ReactNode;
};

export default function App({ Component, pageProps }: AppProps) {
  // Pages can opt out of the global header/footer chrome (e.g. the fullscreen
  // talk presentation view) by exporting a `getLayout` that returns the page
  // as-is. Everything else falls through to the default LayoutWrapper.
  const ComponentWithLayout = Component as NextPageWithLayout;
  const getLayout =
    ComponentWithLayout.getLayout ??
    ((page: ReactElement) => <LayoutWrapper>{page}</LayoutWrapper>);

  const tree = (
    <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
      <SearchProvider>
        <Head>
          <meta content="width=device-width, initial-scale=1" name="viewport" />
        </Head>
        <Analytics />
        {getLayout(<Component {...pageProps} />)}
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
