import type { ZilaCommand } from "./registry.js";

export const assistantCommand: ZilaCommand = {
  name: "assistant",
  aliases: ["a"],
  description: "Chat with your AI progress companion",
  usage: "assistant",
  category: "agent",
  available: true,
  handler: async (_args, _output, shell) => {
    shell.startAssistant();
  },
};
