const { execSync } = require('node:child_process');

module.exports = [
  {
    name: 'run_npm_script',
    description: 'Runs an npm/pnpm script or a project command',
    parameters: {
      type: 'OBJECT',
      properties: {
        command: {
          type: 'STRING',
          description:
            'The command or script name to run (e.g., "test", "npm run build")',
        },
      },
      required: ['command'],
    },
    handler: async ({ command }) => {
      try {
        let fullCommand = command.trim();
        // Simple heuristic to prepend npm run if just a script name is given
        if (
          !fullCommand.startsWith('npm ') &&
          !fullCommand.startsWith('pnpm ') &&
          !fullCommand.startsWith('npx ')
        ) {
          fullCommand = `npm run ${fullCommand}`;
        }

        const output = execSync(fullCommand, {
          encoding: 'utf8',
          stdio: 'pipe',
        }).trim();
        return output || '(Command completed successfully with no output)';
      } catch (e) {
        return `Command failed: ${e.message}\nStdout: ${e.stdout}\nStderr: ${e.stderr}`;
      }
    },
  },
];
