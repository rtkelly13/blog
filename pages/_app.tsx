// Proposal C — Editorial Three-Role typography, loaded via next/font/local
// (lib/fonts.ts; --font-* variables defined on :root below).
// Display: Space Grotesk · Body: Inter · Code/UI: IBM Plex Mono · Logo: VT323
import '@/css/tailwind.css';

import { ConvexAuthProvider } from '@convex-dev/auth/react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider } from 'next-themes';
import type { ReactElement, ReactNode } from 'react';

import AdminIndicator from '@/components/AdminIndicator';
import Analytics from '@/components/analytics';
import LayoutWrapper from '@/components/LayoutWrapper';
import SearchProvider from '@/components/search/SearchProvider';
import { convex } from '@/lib/convexClient';
import { fontRootVariables } from '@/lib/fonts';

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
        <style dangerouslySetInnerHTML={{ __html: fontRootVariables }} />
        <Analytics />
        {getLayout(<Component {...pageProps} />)}
      </SearchProvider>
    </ThemeProvider>
  );

  // Only mount the Convex provider when a deployment is configured. Everything
  // else renders unchanged when NEXT_PUBLIC_CONVEX_URL is unset. ConvexAuthProvider
  // adds GitHub-session handling (tokens in localStorage) on top of ConvexProvider.
  return convex ? (
    <ConvexAuthProvider client={convex}>
      {tree}
      <AdminIndicator />
    </ConvexAuthProvider>
  ) : (
    tree
  );
}
