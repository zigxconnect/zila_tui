import type { ZilaCommand } from "./registry.js";

export const statsScreenCommand: ZilaCommand = {
  name: "stats-screen",
  aliases: ["dashboard", "progress"],
  description: "Open interactive stats dashboard",
  usage: "stats-screen",
  category: "gamification",
  available: true,
  handler: async (_args, _output, shellContext) => {
    shellContext.startStats?.();
  },
};
