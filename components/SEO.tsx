import Head from 'next/head';
import { useRouter } from 'next/router';
import type { AuthorFrontMatter } from 'types/AuthorFrontMatter';
import type { PostFrontMatter } from 'types/PostFrontMatter';
import siteMetadata from '@/data/siteMetadata';
import { isNoIndexRoute } from '@/lib/seo/routePolicy';

interface CommonSEOProps {
  title: string;
  description: string;
  ogType: string;
  ogImage:
    | string
    | {
        '@type': string;
        url: string;
      }[];
  twImage: string;
  /**
   * Force `noindex` for a page the route policy can't judge on its own —
   * unpublished content sharing a route with published content (a `draft: true`
   * talk, say). Route-level exclusions belong in `lib/seo/routePolicy.mjs`.
   */
  noindex?: boolean;
}

/**
 * The single `robots` tag for the page.
 *
 * Emitted here rather than in `_app` so there is exactly one per page and no
 * reliance on `next/head` dedupe order between the app shell and a page that
 * needs to override the default.
 */
const useRobotsContent = (noindex?: boolean) => {
  const { pathname } = useRouter();
  return noindex || isNoIndexRoute(pathname)
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large';
};

/**
 * Absolute URL for the current route, with query string and hash stripped.
 *
 * `router.asPath` carries `?query#hash`, which must not reach a canonical tag —
 * that is the whole job of a canonical: collapse parameter variants onto one
 * address.
 */
const useCanonicalUrl = () => {
  const { asPath } = useRouter();
  const path = asPath.split(/[?#]/)[0];
  return `${siteMetadata.siteUrl}${path === '/' ? '' : path}`;
};

const CommonSEO = ({
  title,
  description,
  ogType,
  ogImage,
  twImage,
  noindex,
}: CommonSEOProps) => {
  const canonicalUrl = useCanonicalUrl();
  const robots = useRobotsContent(noindex);
  return (
    <Head>
      <title>{title}</title>
      <meta name="robots" content={robots} />
      <meta name="description" content={description} />
      {/* Canonical lives here rather than in BlogSEO so every page gets one —
          paginated listings and tag pages especially, where the same posts
          surface at several addresses. */}
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={siteMetadata.title} />
      <meta property="og:description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:locale" content={siteMetadata.locale} />
      {Array.isArray(ogImage) ? (
        ogImage.map(({ url }) => (
          <meta property="og:image" content={url} key={url} />
        ))
      ) : (
        <meta property="og:image" content={ogImage} key={ogImage} />
      )}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={siteMetadata.xHandle} />
      <meta name="twitter:creator" content={siteMetadata.xHandle} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={twImage} />
    </Head>
  );
};

interface PageSEOProps {
  title: string;
  description: string;
  noindex?: boolean;
}

export const PageSEO = ({ title, description, noindex }: PageSEOProps) => {
  const ogImageUrl = siteMetadata.siteUrl + siteMetadata.socialBanner;
  const twImageUrl = siteMetadata.siteUrl + siteMetadata.socialBanner;
  return (
    <CommonSEO
      title={title}
      description={description}
      ogType="website"
      ogImage={ogImageUrl}
      twImage={twImageUrl}
      noindex={noindex}
    />
  );
};

export const TagSEO = ({ title, description }: PageSEOProps) => {
  const ogImageUrl = siteMetadata.siteUrl + siteMetadata.socialBanner;
  const twImageUrl = siteMetadata.siteUrl + siteMetadata.socialBanner;
  const canonicalUrl = useCanonicalUrl();
  return (
    <>
      <CommonSEO
        title={title}
        description={description}
        ogType="website"
        ogImage={ogImageUrl}
        twImage={twImageUrl}
      />
      <Head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${description} - RSS feed`}
          href={`${canonicalUrl}/feed.xml`}
        />
      </Head>
    </>
  );
};

/**
 * Site-level structured data: who the site belongs to, and where its search
 * lives. Rendered once, on the homepage — per-post `Article` data comes from
 * `BlogSEO` instead.
 */
export const SiteStructuredData = () => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${siteMetadata.siteUrl}/#person`,
        name: siteMetadata.author,
        url: siteMetadata.siteUrl,
        email: siteMetadata.email,
        sameAs: [
          siteMetadata.github,
          siteMetadata.linkedin,
          siteMetadata.x,
        ].filter(Boolean),
      },
      {
        '@type': 'WebSite',
        '@id': `${siteMetadata.siteUrl}/#website`,
        url: siteMetadata.siteUrl,
        name: siteMetadata.title,
        description: siteMetadata.description,
        inLanguage: siteMetadata.language,
        publisher: { '@id': `${siteMetadata.siteUrl}/#person` },
      },
    ],
  };

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData, null, 2),
        }}
      />
    </Head>
  );
};

interface BlogSeoProps extends PostFrontMatter {
  authorDetails?: AuthorFrontMatter[];
  url: string;
}

export const BlogSEO = ({
  authorDetails,
  title,
  summary,
  date,
  lastmod,
  url,
  slug,
  draft,
  images = [],
}: BlogSeoProps) => {
  const publishedAt = new Date(date).toISOString();
  const modifiedAt = new Date(lastmod || date).toISOString();
  // With no explicit front-matter image, fall back to the post's
  // deterministic, build-generated OG card (scripts/generate-og-images.mjs)
  // rather than the generic site banner, so every post shares a unique card.
  const fallbackImage = slug
    ? `/static/og/${slug}.png`
    : siteMetadata.socialBanner;
  const imagesArr =
    images.length === 0
      ? [fallbackImage]
      : typeof images === 'string'
        ? [images]
        : images;

  const featuredImages = imagesArr.map((img) => {
    return {
      '@type': 'ImageObject',
      url: `${siteMetadata.siteUrl}${img}`,
    };
  });

  let authorList;
  if (authorDetails) {
    authorList = authorDetails.map((author) => {
      return {
        '@type': 'Person',
        name: author.name,
      };
    });
  } else {
    authorList = {
      '@type': 'Person',
      name: siteMetadata.author,
    };
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    headline: title,
    image: featuredImages,
    datePublished: publishedAt,
    dateModified: modifiedAt,
    author: authorList,
    publisher: {
      '@type': 'Organization',
      name: siteMetadata.author,
      logo: {
        '@type': 'ImageObject',
        url: `${siteMetadata.siteUrl}${siteMetadata.siteLogo}`,
      },
    },
    description: summary,
  };

  const twImageUrl = featuredImages[0].url;

  return (
    <>
      <CommonSEO
        title={title}
        description={summary}
        ogType="article"
        ogImage={featuredImages}
        twImage={twImageUrl}
        // `getStaticPaths` builds a page for every file in `data/blog`, drafts
        // included, so an unfinished post is reachable by URL in production. It
        // is unlisted everywhere else — keep it out of the index too.
        noindex={draft}
      />
      <Head>
        {date && (
          <meta property="article:published_time" content={publishedAt} />
        )}
        {lastmod && (
          <meta property="article:modified_time" content={modifiedAt} />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData, null, 2),
          }}
        />
      </Head>
    </>
  );
};
