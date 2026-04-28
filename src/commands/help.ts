import type { ZilaCommand } from "./registry.js";

export const helpCommand: ZilaCommand = {
  name: "help",
  aliases: ["h", "?"],
  description: "Browse all commands interactively",
  usage: "help",
  category: "info",
  available: true,
  handler: async (_args, _output, shell) => {
    shell.showHelp();
  },
};
