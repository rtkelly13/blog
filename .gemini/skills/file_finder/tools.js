module.exports = [
  {
    name: 'find_files',
    description: 'Finds files in the codebase using glob patterns',
    parameters: {
      type: 'OBJECT',
      properties: {
        pattern: {
          type: 'STRING',
          description:
            'The glob pattern to match (e.g., "**/*.ts", "src/**/*.md")',
        },
      },
      required: ['pattern'],
    },
    handler: async ({ pattern }) => {
      const { globby } = await import('globby');
      try {
        const files = await globby(pattern, { gitignore: true });
        return files.length > 0
          ? files.join('\n')
          : 'No files found matching the pattern.';
      } catch (e) {
        return `Error finding files: ${e.message}`;
      }
    },
  },
];
