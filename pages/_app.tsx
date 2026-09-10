// Proposal C — Editorial Three-Role typography, loaded via next/font/local
// (lib/fonts.ts; --font-* variables defined on :root below).
// Display: Space Grotesk · Body: Inter · Code/UI: IBM Plex Mono · Logo: VT323
import '@/css/tailwind.css';
// Self-hosted KaTeX styles, version-matched to the katex that rehype-katex
// renders with (a CDN stylesheet on a different major/minor silently breaks
// math layout).
import 'katex/dist/katex.min.css';

import { ConvexAuthProvider } from '@convex-dev/auth/react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider } from 'next-themes';
import type { ReactElement, ReactNode } from 'react';

import AdminIndicator from '@/components/AdminIndicator';
import Analytics from '@/components/analytics';
import DisplayFontFlag from '@/components/DisplayFontFlag';
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
    <ThemeProvider
      // Both, and this is load-bearing rather than belt-and-braces.
      //
      // The design system's generated `theme.css` selects on
      // `[data-theme="..."]` — that is the package's contract, and its
      // `@custom-variant` rules are built from the same selector. This app set
      // only `attribute="class"`, so `[data-theme="sketch"]` never matched and
      // the light level received **no** package tokens at all: only the
      // `:root` block, which is midnight.
      //
      // That is why `css/tailwind.css` used to carry its own light accents. It
      // was not duplication for its own sake, it was the only thing making
      // sketch light — and it drifted, ending up three values that failed WCAG
      // AA. Setting the attribute too lets the package's gated values through
      // and is what makes deleting those overrides safe.
      //
      // The class is kept because this repo's own CSS selects on `.sketch` and
      // `.midnight`, and because `dark:` utilities resolve through it.
      attribute={['class', 'data-theme']}
      defaultTheme="midnight"
      enableSystem={false}
      disableTransitionOnChange
      themes={['midnight', 'sketch']}
    >
      <SearchProvider>
        <Head>
          <meta content="width=device-width, initial-scale=1" name="viewport" />
        </Head>
        <style dangerouslySetInnerHTML={{ __html: fontRootVariables }} />
        <DisplayFontFlag />
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
