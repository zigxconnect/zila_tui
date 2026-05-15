import type { ZilaCommand } from "./registry.js";

export const aboutCommand: ZilaCommand = {
  name: "about-me",
  aliases: ["profile", "me"],
  description: "Display your Zigex developer profile",
  usage: "about-me",
  category: "info",
  available: true,
  handler: async (_args, _output, shellContext) => {
    shellContext.startAbout();
  },
};