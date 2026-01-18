const { execSync } = require('node:child_process');

module.exports = [
  {
    name: 'manage_deps',
    description:
      'Checks and manages project dependencies (install, audit, outdated)',
    parameters: {
      type: 'OBJECT',
      properties: {
        command: {
          type: 'STRING',
          description:
            'The dependency command to run (e.g., "install", "audit", "outdated")',
        },
      },
      required: ['command'],
    },
    handler: async ({ command }) => {
      try {
        const fullCommand = `npm ${command.trim()}`;
        const output = execSync(fullCommand, {
          encoding: 'utf8',
          stdio: 'pipe',
        }).trim();
        return output || '(Command completed)';
      } catch (e) {
        // npm outdated returns exit code 1 if packages are outdated, but we want the stdout
        if (command.includes('outdated') && e.stdout) {
          return e.stdout;
        }
        return `Dependency command failed: ${e.message}\n${e.stdout || ''}`;
      }
    },
  },
];
