const { execSync } = require('node:child_process');

module.exports = [
  {
    name: 'search_code',
    description: 'Searches code for patterns, keywords, or text using grep',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'The text or pattern to search for',
        },
      },
      required: ['query'],
    },
    handler: async ({ query }) => {
      try {
        // -r: recursive, -n: line number, -I: ignore binary, -E: extended regex
        // Manual escaping to be safe
        const safeQuery = query.replace(/"/g, '\\"');
        const output = execSync(`grep -rnIE "${safeQuery}" .`, {
          encoding: 'utf8',
          stdio: 'pipe',
        }).trim();
        return output || 'No matches found.';
      } catch (e) {
        if (e.status === 1) return 'No matches found.';
        return `Search failed: ${e.stderr || e.message}`;
      }
    },
  },
];
