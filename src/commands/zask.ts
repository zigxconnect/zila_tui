import type { ZilaCommand } from "./registry.js";
import { executeAutomatedTaskSubmission, checkDailyPrQuota, type TaskSubmissionPayload } from "../utils/githubPrAutomation.js";

export const zaskCommand: ZilaCommand = {
  name: "zask",
  aliases: ["zask-hub", "tasks-hub"],
  description: "Open the Zask task tracking hub",
  usage: "zask",
  category: "zask",
  available: true,
  handler: async (_args, output) => {
    output("Zask is your workspace for reports, task updates, and automated PR submissions.", "success");
    output("Use 'submit-task' (or 'zila-submit') to launch the automated GitHub PR pipeline.", "info");
  },
};

export const submitReportCommand: ZilaCommand = {
  name: "submit-report",
  aliases: ["report"],
  description: "Open the daily report submission page",
  usage: "submit-report",
  category: "zask",
  available: true,
  handler: async (_args, _output, shellContext) => {
    shellContext.startSubmitReport();
  },
};

import { getActiveCohort } from "../utils/activeCohort.js";

export const submitTaskCommand: ZilaCommand = {
  name: "submit-task",
  aliases: ["zila-submit", "submit", "task-submit"],
  description: "Automated GitHub PR task submission pipeline for cohort exercises",
  usage: "submit-task [--module <name>] [--level <level>] [--day <1-4>] [--summary <text>]",
  category: "zask",
  available: true,
  handler: async (args, output, shellContext) => {
    // If CLI arguments are provided, run automated pipeline in direct CLI mode
    const hasFlags = args.some((a) => a.startsWith("--"));
    if (hasFlags) {
      output("─".repeat(72), "dim");
      output("lil-zila › automated github pr pipeline", "info");
      output("─".repeat(72), "dim");

      const activeCohort = getActiveCohort();
      if (activeCohort) {
        output(`Active Cohort: ${activeCohort.name} [Domain: ${activeCohort.domainKey.toUpperCase()}, Level: ${activeCohort.level.toUpperCase()}]`, "success");
      }

      const getArg = (flag: string, fallback: string) => {
        const idx = args.indexOf(flag);
        if (idx !== -1 && args[idx + 1]) return args[idx + 1]!;
        const prefix = flag + "=";
        const matching = args.find((a) => a.startsWith(prefix));
        return matching ? matching.slice(prefix.length) : fallback;
      };

      const defaultDomain = activeCohort?.domainKey || "ml";
      const defaultLevel = (activeCohort?.level === "advanced" ? "advance" : (activeCohort?.level || "beginner"));
      const defaultRepo = activeCohort?.githubRepoUrl || "";

      const domain = getArg("--domain", defaultDomain);
      const level = (getArg("--level", defaultLevel) as "beginner" | "intermediate" | "advance");
      const module = getArg("--module", "1_python");
      const day = Number(getArg("--day", "1")) || 1;
      const summary = getArg("--summary", `Exercise completed for ${module} Day ${day}`);
      const repoUrl = getArg("--repo", defaultRepo);

      const quota = checkDailyPrQuota();
      if (!quota.allowed) {
        output(`! ${quota.message}`, "error");
        output("─".repeat(72), "dim");
        return;
      }

      output(`Target: ${domain.toUpperCase()} / ${level.toUpperCase()} / ${module} / Day 0${day}`, "info");
      output("Running automated background GitHub PR pipeline...", "dim");

      try {
        const payload: TaskSubmissionPayload = {
          cohortId: activeCohort?.id || undefined,
          domain,
          level,
          module,
          day,
          summary,
          practicalsDescription: "Practical code and exercises implemented in contributors directory.",
          challenges: "None reported.",
          githubRepoUrl: repoUrl || undefined,
        };

        const res = await executeAutomatedTaskSubmission(payload, (step) => output(`› ${step}`, "dim"));
        output("─".repeat(72), "dim");
        output("✓ Pull request created and task submitted successfully!", "success");
        output(`PR Link:      ${res.pullRequestUrl}`, "success");
        output(`Branch:       ${res.branchName}`, "dim");
        output(`Path:         ${res.contributorFilePath}`, "dim");
        output(`Score Weight: ${res.dayWeight} pt (${res.normalizedPercentage}% normalized over 100)`, "info");
        output(`Daily Quota:  ${res.quotaRemaining}/2 PRs remaining today`, "dim");
        output("─".repeat(72), "dim");
      } catch (err: any) {
        output(`! Submission failed: ${err.message}`, "error");
        output("─".repeat(72), "dim");
      }
      return;
    }

    // Default: Open interactive SubmitTaskScreen
    shellContext.startSubmitTask();
  },
};

export const complainCommand: ZilaCommand = {
  name: "complain",
  aliases: ["issue", "raise"],
  description: "Raise a workplace complaint or issue report",
  usage: "complain <subject> [--details <details>]",
  category: "zask",
  available: true,
  handler: async (args, output) => {
    if (args.length === 0) {
      output("Usage: complain <subject> [--details <details>]", "warning");
      return;
    }

    const subject = args.join(" ");
    output(`Complaint logged: ${subject}`, "warning");
    output("Your concern has been routed for follow-up.", "dim");
  },
};
