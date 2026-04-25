import { type ZilaCommand } from './registry.js';

export const helpCommand: ZilaCommand = {
  name: 'help',
  aliases: ['h'],
  description: 'Show this menu',
  usage: 'help',
  category: 'info',
  available: true,
  handler: async (args, output, shell) => {
    shell.showHelp();
  }
};