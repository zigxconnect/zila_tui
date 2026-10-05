import type { ZilaCommand } from "./registry.js";
import { checkDailyPrQuota, resetLocalQuota } from "../utils/githubPrAutomation.js";

export const quotaCommand: ZilaCommand = {
  name: "quota",
  aliases: ["reset-quota", "pr-quota"],
  description: "View or reset your daily PR submission quota",
  usage: "quota [--reset]",
  category: "zask",
  available: true,
  handler: async (args, output) => {
    if (args.includes("--reset") || args.includes("-r")) {
      resetLocalQuota();
      output("─".repeat(72), "dim");
      output("✓ PR submission quota reset successfully! You have 2/2 PRs available today.", "success");
      output("─".repeat(72), "dim");
      return;
    }

    const quota = checkDailyPrQuota();
    output("─".repeat(72), "dim");
    output("lil-zila › daily pr submission quota", "info");
    output("─".repeat(72), "dim");
    output(`Daily Limit:        2 PRs per calendar day`, "default");
    output(`Submissions Today:  ${quota.countToday} used`, quota.allowed ? "default" : "warning");
    output(`Remaining Today:    ${quota.remainingToday} available`, quota.allowed ? "success" : "error");
    output(`Status:             ${quota.message}`, quota.allowed ? "dim" : "error");
    output("─".repeat(72), "dim");
    output("Tip: Run 'quota --reset' to clear your local submission quota.", "dim");
    output("─".repeat(72), "dim");
  },
};
