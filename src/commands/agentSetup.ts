import type { ZilaCommand } from "./registry.js";
import { loadAgentConfig } from "../utils/aiConfig.js";

export const agentSetupCommand: ZilaCommand = {
  name: "agent",
  aliases: ["ai-setup"],
  description: "Configure multi-provider autonomous AI pair programmer (Gemini, Groq, Claude, OpenAI)",
  usage: "agent [--setup | --status | --clear]",
  category: "agent",
  available: true,
  handler: async (args, output, shell) => {
    if (args.includes("--status")) {
      const config = loadAgentConfig();
      if (!config) {
        output("✖ No AI provider currently configured. Run 'agent --setup' to configure one.", "warning");
      } else {
        output(`✔ Active AI Provider: ${config.provider}`, "success");
        output(`Model: ${config.model}`, "info");
        output(`Configured at: ${new Date(config.configuredAt).toLocaleString()}`, "dim");
      }
      return;
    }

    if (args.includes("--clear")) {
      const { clearAgentConfig } = await import("../utils/aiConfig.js");
      clearAgentConfig();
      output("✔ AI Agent configuration cleared.", "success");
      return;
    }

    // Default or --setup: Launch interactive agent setup wizard screen
    if (shell?.startAgentSetup) {
      shell.startAgentSetup();
    } else {
      output("Please run 'agent --setup' inside the interactive Zila shell, or set GEMINI_API_KEY/OPENAI_API_KEY.", "info");
    }
  },
};
