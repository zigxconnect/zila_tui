import { registerCommand, type ZilaCommand } from "./registry.js";
import { exitCommand } from "./exit.js";
import { helpCommand } from "./help.js";
import { initCommand } from "./init/index.js";

const comingSoon: ZilaCommand[] = [
  {
    name: "search",
    description: "Find internships via RAG-powered semantic search",
    usage: "search <query>",
    category: "search",
    available: false,
    handler: async () => {},
  },
  {
    name: "evaluate",
    description: "Get your internship fit score",
    usage: "evaluate <id>",
    category: "agent",
    available: false,
    handler: async () => {},
  },
  {
    name: "assistant",
    description: "Chat with your AI progress companion",
    usage: "assistant [--agent]",
    category: "agent",
    available: false,
    handler: async () => {},
  },
];

export function registerAllCommands(): void {
  registerCommand(exitCommand);
  registerCommand(helpCommand);
  registerCommand(initCommand);
  comingSoon.forEach(registerCommand);
}
