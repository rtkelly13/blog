const siteMetadata = {
  title: 'Ryan Kelly Blog',
  author: 'Ryan Kelly',
  headerTitle: '',
  // Used as the homepage meta description, og:description, and the RSS channel
  // description. Drafted by an agent as a suggestion — the wording is the
  // author's to own (docs/posting.md → authorship policy).
  description:
    'Ryan Kelly on software engineering — AWS, .NET, infrastructure as code, and working with coding agents. War stories from a decade of shipping.',
  language: 'en-us',
  // No trailing slash: this is concatenated with absolute paths (`/blog/…`,
  // `/static/…`) in canonical, og:url and og:image tags, and a trailing slash
  // there produces `https://ryankelly.dev//blog/…`.
  siteUrl: 'https://ryankelly.dev',
  siteRepo: 'https://github.com/rtkelly13/blog',
  siteLogo: '/static/images/logo-square.svg',
  image: '/static/images/myprofile.jpg',
  socialBanner: '/static/images/og-card.png',
  email: '94ryan.kelly@gmail.com',
  github: 'https://github.com/rtkelly13',
  x: 'https://x.com/RTKelly25',
  // `twitter:site` wants an @handle, not a profile URL.
  xHandle: '@RTKelly25',
  facebook: '',
  youtube: '',
  linkedin: 'https://www.linkedin.com/in/rtkelly94/',
  locale: 'en-US',
  stickyNav: true, // Set to false to disable sticky navigation
  analytics: {
    // supports plausible, simpleAnalytics or googleAnalytics
    plausibleDataDomain: '', // e.g. tailwind-nextjs-starter-blog.vercel.app
    simpleAnalytics: false, // true or false
    googleAnalyticsId: '', // e.g. UA-000000-2 or G-XXXXXXX
  },
  comment: {
    // Select a provider and use the environment variables associated to it
    // https://vercel.com/docs/environment-variables
    provider: 'giscus', // supported providers: giscus, utterances, disqus
    giscusConfig: {
      // Visit the link below, and follow the steps in the 'configuration' section
      // https://giscus.app/
      repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
      repositoryId: process.env.NEXT_PUBLIC_GISCUS_REPOSITORY_ID,
      category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
      categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
      mapping: 'pathname', // supported options: pathname, url, title
      reactions: '1', // Emoji reactions: 1 = enable / 0 = disable
      // Send discussion metadata periodically to the parent window: 1 = enable / 0 = disable
      metadata: '0',
      // theme example: light, dark, dark_dimmed, dark_high_contrast
      // transparent_dark, preferred_color_scheme, custom
      theme: 'light',
      // theme when dark mode
      darkTheme: 'transparent_dark',
      // If the theme option above is set to 'custom`
      // please provide a link below to your custom theme css file.
      // example: https://giscus.app/themes/custom_example.css
      themeURL: '',
    },
    utterancesConfig: {
      // Visit the link below, and follow the steps in the 'configuration' section
      // https://utteranc.es/
      repo: process.env.NEXT_PUBLIC_UTTERANCES_REPO,
      issueTerm: '', // supported options: pathname, url, title
      label: '', // label (optional): Comment 💬
      // theme example: github-light, github-dark, preferred-color-scheme
      // github-dark-orange, icy-dark, dark-blue, photon-dark, boxy-light
      theme: '',
      // theme when dark mode
      darkTheme: '',
    },
    disqus: {
      // https://help.disqus.com/en/articles/1717111-what-s-a-shortname
      shortname: process.env.NEXT_PUBLIC_DISQUS_SHORTNAME,
    },
  },
  newsletter: {
    provider: 'buttondown',
    enabled: false, // Set to true when ready to enable
  },
};

module.exports = siteMetadata;
