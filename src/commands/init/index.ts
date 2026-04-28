import type { ZilaCommand } from "../registry.js";

export const initCommand: ZilaCommand = {
  name: "init",
  aliases: ["i"],
  description: "Set up your workspace (clone curriculum + assistant)",
  usage: "init",
  category: "setup",
  available: true,
  handler: async (_args, _output, shell) => {
    shell.startInit();
  },
};
