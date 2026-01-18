const { execSync } = require('node:child_process');

module.exports = [
  {
    name: 'check_env_tool',
    description: 'Checks the version of an installed tool',
    parameters: {
      type: 'OBJECT',
      properties: {
        tool: {
          type: 'STRING',
          description: 'The tool to check (e.g., "node", "npm", "git")',
        },
      },
      required: ['tool'],
    },
    handler: async ({ tool }) => {
      try {
        const output = execSync(`${tool.trim()} --version`, {
          encoding: 'utf8',
          stdio: 'pipe',
        }).trim();
        return `${tool}: ${output}`;
      } catch (_e) {
        return `Error: Tool '${tool}' not found or failed to report version.`;
      }
    },
  },
];
