const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

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
});
