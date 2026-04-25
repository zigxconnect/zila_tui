import { registerCommand, type ZilaCommand } from "./registry.js";
import { exitCommand } from "./exit.js";
import { helpCommand } from "./help.js";
import { initCommand } from "./init/index.js";

// Dummy commands to flesh out the menu UI as per the spec
const dummyCommands: ZilaCommand[] = [
  // { name: 'init', aliases: ['i'], description: 'Initialise your workspace', usage: 'init', category: 'setup', available: true, handler: async () => {} },
  {
    name: "assistant",
    description: "Chat with your AI companion",
    usage: "assistant",
    category: "agent",
    available: false,
    handler: async () => {},
  },
  {
    name: "evaluate",
    description: "Get your internship fit score",
    usage: "evaluate",
    category: "agent",
    available: false,
    handler: async () => {},
  },
];

export function registerAllCommands() {
  registerCommand(exitCommand);
  registerCommand(helpCommand);
  registerCommand(initCommand);
  dummyCommands.forEach(registerCommand);
}
