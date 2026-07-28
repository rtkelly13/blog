const path = require('node:path');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Every external origin the site talks to must be listed here. Current set:
// - giscus.app                comments widget (script + iframe)
// - www.youtube-nocookie.com  talk recording embeds (RecordingEmbed)
// - *.convex.cloud            realtime backend (HTTPS + WebSocket)
// - fonts.googleapis.com / fonts.gstatic.com  Inter stylesheet in _document
// - cdn.jsdelivr.net          KaTeX stylesheet in _document
// 'unsafe-eval' is required by mdx-bundler, which evaluates compiled MDX
// with `new Function` at render time.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' giscus.app;
  style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.jsdelivr.net;
  img-src * blob: data:;
  media-src 'self';
  connect-src 'self' https://*.convex.cloud wss://*.convex.cloud;
  font-src 'self' data: fonts.gstatic.com cdn.jsdelivr.net;
  frame-src giscus.app www.youtube-nocookie.com;
  frame-ancestors 'none';
`;

const securityHeaders = [
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\n/g, ''),
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

/**
 * @type {import('next').NextConfig}
 **/
module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  experimental: { esmExternals: true },
  // Bundle node_modules deps into the server output instead of externalizing
  // them into .next/node_modules. Under pnpm, externalized ESM packages (e.g.
  // rehype-autolink-headings and its transitive deps) aren't resolvable at
  // runtime, which broke `next start` in CI. Bundling fixes the whole class.
  bundlePagesRouterDependencies: true,
  // When @rtkelly13/design-system is pnpm-linked to the sibling checkout
  // (`pnpm ds:link`), the symlink escapes the project root and Turbopack
  // refuses to resolve it. Widening the root to the parent directory keeps
  // the linked-dev flow working; harmless when installed from the registry.
  turbopack: { root: path.join(__dirname, '..') },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
});
