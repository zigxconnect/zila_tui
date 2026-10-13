import type { ZilaCommand } from "./registry.js";

export const lilAgentCommand: ZilaCommand = {
  name: "lil-agent",
  aliases: ["chat", "ai"],
  description: "Launch Claude Code-style interactive AI pair programmer shell",
  usage: "lil-agent",
  category: "assistant",
  available: true,
  handler: async (_args, _output, shell) => {
    if (shell?.startLilAgent) {
      shell.startLilAgent();
    } else {
      console.log("Starting Lil-Agent in standalone terminal mode...");
    }
  },
};
