import type { ZilaCommand } from "./registry.js";

export const exitCommand: ZilaCommand = {
  name: "exit",
  aliases: ["quit", "q"],
  description: "Leave ZILA",
  usage: "exit",
  category: "info",
  available: true,
  handler: async (_args, _output, shell) => {
    shell.exit();
  },
};
