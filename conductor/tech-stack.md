# Technology Stack

## Core Frameworks and Languages
- **Base Template:** [Tailwind Nextjs Starter Blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) - A feature-rich, highly customizable blog starter.
- **Frontend Framework:** [Next.js](https://nextjs.org/) (React) - Utilizing both static site generation and server-side rendering for optimal performance.
- **Language:** [TypeScript](https://www.typescriptlang.org/) - For robust, type-safe development.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework for rapid and consistent UI development.

## Content and Data
- **Content Format:** [MDX](https://mdxjs.com/) - Allowing the use of React components within Markdown files for interactive content.
- **MDX Bundler:** `mdx-bundler` - For processing MDX files and managing dependencies.
- **Metadata Management:** `gray-matter` - For parsing frontmatter in Markdown/MDX files.

## Development and Tooling
- **Linting:** [ESLint](https://eslint.org/) - For maintaining code quality and adhering to standards.
- **Formatting:** [Prettier](https://prettier.io/) - For consistent code formatting across the project.
- **Git Hooks:** [Husky](https://typicode.github.io/husky/) and `lint-staged` - To automate linting and formatting on commit.
- **Package Manager:** npm

## Deployment and Infrastructure
- **Hosting:** Optimized for platforms like Vercel or Netlify (standard for Next.js).
- **Analytics:** Supports multiple providers including Google Analytics, Plausible, and Simple Analytics (configured via `siteMetadata.js`).
- **Comments:** Integrated with Giscus, Utterances, or Disqus.
