import type { ZilaCommand } from "./registry.js";

export const infoCommand: ZilaCommand = {
  name: "info",
  aliases: ["status"],
  description: "Show your internship status and active roles",
  usage: "info",
  category: "info",
  available: true,
  handler: async (_args, _output, shellContext) => {
    shellContext.startInfo();
  },
};