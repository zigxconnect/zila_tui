import { registerCommand, type ZilaCommand } from "./registry.js";
import { exitCommand } from "./exit.js";
import { helpCommand } from "./help.js";
import { initCommand } from "./init/index.js";
import { assistantCommand } from "./assistant.js";
import { authCommand } from "./auth.js";
import { infoCommand } from "./info.js";
import { aboutCommand } from "./about.js";
import { searchCommand } from "./search.js";
import { evaluateCommand } from "./evaluate.js";
import { clearCommand } from "./clear.js";
// import { trackCommand } from "./track/index.js";
// import { logCommand } from "./log.js";

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
];

export function registerAllCommands(): void {
  registerCommand(exitCommand);
  registerCommand(helpCommand);
  registerCommand(initCommand);
  registerCommand(assistantCommand);
  registerCommand(authCommand);
  registerCommand(infoCommand);
  registerCommand(aboutCommand);
  registerCommand(searchCommand);
  registerCommand(evaluateCommand);
  registerCommand(clearCommand);
  // registerCommand(trackCommand);
  // registerCommand(logCommand);
}