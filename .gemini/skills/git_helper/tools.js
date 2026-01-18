const { execSync } = require('node:child_process');

module.exports = [
  {
    name: 'run_git_command',
    description: 'Executes a git command and returns the output',
    parameters: {
      type: 'OBJECT',
      properties: {
        command: {
          type: 'STRING',
          description:
            'The git command to run (e.g., "status", "diff HEAD", "log -n 5")',
        },
      },
      required: ['command'],
    },
    handler: async ({ command }) => {
      try {
        let fullCommand = command.trim();
        if (!fullCommand.startsWith('git ')) {
          fullCommand = `git ${fullCommand}`;
        }
        const output = execSync(fullCommand, {
          encoding: 'utf8',
          stdio: 'pipe',
        }).trim();
        return output || '(Done - no output)';
      } catch (e) {
        return `Git command failed: ${e.stderr || e.message}`;
      }
    },
  },
];
