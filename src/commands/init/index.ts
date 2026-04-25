import { type ZilaCommand } from '../registry.js';

export const initCommand: ZilaCommand = {
  name: 'init',
  aliases: ['i'],
  description: 'Initialise your workspace',
  usage: 'init',
  category: 'setup',
  available: true,
  handler: async (args, output, shell) => {
    // We pass control over to the InitScreen UI component
    shell.startInit();
  }
};