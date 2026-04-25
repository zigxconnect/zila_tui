import { type ZilaCommand } from './registry.js';

export const exitCommand: ZilaCommand = {
  name: 'exit',
  aliases: ['quit', 'q'],
  description: 'Leave ZILA',
  usage: 'exit',
  category: 'info',
  available: true,
  handler: async (args, output, shell) => {
    // We don't output anything, we just tell the shell to trigger the exit flow
    shell.exit();
  }
};