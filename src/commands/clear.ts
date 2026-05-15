import type { ZilaCommand } from "./registry.js";

export const clearCommand: ZilaCommand = {
  name: "clear",
  aliases: ["cls"],
  description: "Clear the terminal screen",
  usage: "clear",
  category: "info",
  available: true,
  handler: async (_args, _output, shell) => {
    shell.clearHistory();
  },
};