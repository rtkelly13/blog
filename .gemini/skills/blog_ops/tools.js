const { execSync, spawnSync } = require('node:child_process');

function run(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    throw new Error(e.stderr || e.message);
  }
}

module.exports = [
  {
    name: 'create_blog_post',
    description:
      'Scaffolds a new blog post. Can be run interactively (wizard) or non-interactively (with arguments).',
    parameters: {
      type: 'OBJECT',
      properties: {
        interactive: {
          type: 'BOOLEAN',
          description:
            'If true, launches an interactive wizard in the terminal. Ignores other arguments.',
        },
        title: {
          type: 'STRING',
          description:
            'The title of the blog post (required if interactive is false)',
        },
        summary: {
          type: 'STRING',
          description: 'A brief summary for SEO and previews',
        },
        tags: {
          type: 'STRING',
          description:
            'Comma-separated list of tags (e.g., "nextjs, tailwind")',
        },
        draft: {
          type: 'BOOLEAN',
          description: 'Whether to create as a draft (default: false)',
        },
      },
    },
    handler: async ({ interactive, title, summary, tags, draft }) => {
      if (interactive) {
        try {
          // Inherit stdio to allow user interaction directly in the terminal
          spawnSync('npm', ['run', 'post:wizard'], { stdio: 'inherit' });
          return 'Interactive wizard completed.';
        } catch (error) {
          return `Wizard failed: ${error.message}`;
        }
      }

      if (!title) {
        return 'Error: "title" argument is required when not running interactively.';
      }

      const args = [
        `--title "${title}"`,
        summary ? `--summary "${summary}"` : '',
        tags ? `--tags "${tags}"` : '',
        draft ? '--draft' : '',
      ]
        .filter(Boolean)
        .join(' ');

      try {
        const output = run(`npm run post:create -- ${args}`);
        return output;
      } catch (error) {
        return `Failed to create post: ${error.message}`;
      }
    },
  },
  {
    name: 'update_visual_snapshots',
    description:
      'Triggers the remote CI workflow to update visual regression snapshots, downloads them, and applies them locally.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
    handler: async () => {
      try {
        // This script is interactive/long-running, so we return the output which will contain the logs
        const output = run('npm run test:snapshots:remote');
        return output;
      } catch (error) {
        return `Failed to update snapshots: ${error.message}`;
      }
    },
  },
  {
    name: 'verify_deployment_health',
    description:
      'Checks the status of the current branch on Vercel and GitHub Actions.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
    handler: async () => {
      try {
        const output = run('npm run check:deploy');
        return output;
      } catch (error) {
        return `Failed to verify deployment: ${error.message}`;
      }
    },
  },
  {
    name: 'audit_seo',
    description:
      'Audits all blog posts for missing SEO metadata (tags, summary, images).',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
    handler: async () => {
      try {
        const output = run('npm run check:seo');
        return output;
      } catch (error) {
        return `SEO Audit Failed:\n${error.message}`;
      }
    },
  },
];
