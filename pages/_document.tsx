import Document, { Head, Html, Main, NextScript } from 'next/document';
import siteMetadata from '@/data/siteMetadata';

class MyDocument extends Document {
  // static async getInitialProps(ctx: DocumentContext) {
  //   const initialProps = await Document.getInitialProps(ctx)

  //   return initialProps
  // }

  render() {
    return (
      <Html lang="en">
        <Head>
          <link
            rel="apple-touch-icon"
            sizes="76x76"
            href="/static/favicons/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/static/favicons/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/static/favicons/favicon-16x16.png"
          />
          <link rel="manifest" href="/static/favicons/site.webmanifest" />
          <link
            rel="mask-icon"
            href="/static/favicons/safari-pinned-tab.svg"
            color="#5bbad5"
          />
          <meta name="msapplication-TileColor" content="#000000" />
          <meta name="theme-color" content="#000000" />
          {/* Site-wide feed. The `title` matters once tag feeds are in play
              (components/SEO.tsx → TagSEO adds a second alternate link on tag
              pages) — without it a reader shows two indistinguishable entries. */}
          <link
            rel="alternate"
            type="application/rss+xml"
            title={`${siteMetadata.title} - RSS feed`}
            href={`${siteMetadata.siteUrl}/feed.xml`}
          />
        </Head>
        <body className="antialiased text-white bg-black">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
