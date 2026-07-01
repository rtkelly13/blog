// Convex Auth JWT validation config. CONVEX_SITE_URL is provided automatically
// by the deployment; the `npx @convex-dev/auth` setup writes the signing keys.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
};
