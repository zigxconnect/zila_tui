import type { ZilaCommand, OutputCallback } from "./registry.js";
import { getActiveCohort, setActiveCohort, ActiveCohort } from "../utils/activeCohort.js";
import { zilaApi } from "../utils/auth.js";

export async function fetchLivePlanCohort(): Promise<ActiveCohort | null> {
  const local = getActiveCohort();
  try {
    const res = await zilaApi<{ cohorts: any[] }>("/cohorts/my-cohorts");
    if (res?.cohorts && res.cohorts.length > 0) {
      const matched = local
        ? res.cohorts.find((c) => c.id === local.id) || res.cohorts[0]
        : res.cohorts[0];

      if (matched) {
        return setActiveCohort({
          id: matched.id,
          name: matched.name,
          department: matched.department,
          level: matched.level || "intermediate",
          supervisorName: matched.supervisorName,
          supervisorEmail: matched.supervisorEmail,
          githubRepoUrl: matched.githubRepoUrl,
          isPaid: matched.isPaid,
          tasksSubmittedCount: matched.tasksSubmittedCount,
          freeTasksMax: matched.freeTasksMax ?? 5,
          freeTasksRemaining: matched.freeTasksRemaining,
        });
      }
    }
  } catch {
    // If API unavailable or offline, fallback to local cached cohort
  }
  return local;
}

export async function formatPlanOverview(): Promise<string> {
  const cohort = await fetchLivePlanCohort();
  if (!cohort) {
    return [
      "◈ Zigex Program & Plan Information:",
      "  Status:             No active program or cohort selected",
      "",
      "  💡 To view your plan:",
      "  1. Run 'select --cohorts' to pick an enrolled internship or bootcamp.",
      "  2. Or apply/confirm RSVP in the Zigex App student dashboard.",
    ].join("\n");
  }

  const isPaid = Boolean(cohort.isPaid);
  const used = cohort.tasksSubmittedCount || 0;
  const maxFree = cohort.freeTasksMax ?? 5;
  const remaining = isPaid ? "Unlimited" : Math.max(0, maxFree - used);

  const lines = [
    "◈ Zigex Program & Plan Information:",
    `  Enrolled Program:  ${cohort.name}`,
    `  Domain Track:      ${cohort.domainKey.toUpperCase()} (${cohort.department || "General Track"})`,
    `  Track Level:       ${cohort.level.toUpperCase()}`,
    `  Supervisor:        ${cohort.supervisorName || "Assigned Supervisor"}${cohort.supervisorEmail ? ` <${cohort.supervisorEmail}>` : ""}`,
    `  Contributing Repo: ${cohort.githubRepoUrl || "https://github.com/iws3/sample_repo_zila.git"}${cohort.githubRepoUrl ? " (Supervisor Assigned)" : " (Standard Default)"}`,
    "",
    "◈ Tuition & Billing Status:",
    `  Current Plan:      ${isPaid ? "PRO / FULL ACCESS (Tuition Settled)" : "FREE TRIAL (5 Tasks Free Evaluation)"}`,
    `  Tuition State:     ${isPaid ? "Paid / Verified" : "Unpaid / Trial"}`,
    `  Automated Evals:   ${isPaid ? "Unlimited automated PR reviews & evaluations" : `${used}/${maxFree} evaluations used (${remaining} remaining)`}`,
    "",
    "◈ Evaluation Quota Breakdown:",
    `  Allowed Free Tasks: ${maxFree} task submissions`,
    `  Tasks Evaluated:    ${used} tasks`,
    `  Remaining Quota:    ${remaining}`,
  ];

  if (!isPaid) {
    lines.push("");
    if (used >= maxFree) {
      lines.push("⚠️  ALERT: Free trial evaluation quota exhausted (5/5 used).");
      lines.push("   Automated PR evaluation is paused for this cohort until tuition is paid.");
    } else {
      lines.push(`ℹ️  You have ${remaining} automated evaluation(s) left on the free trial.`);
    }
    lines.push("");
    lines.push("◈ How to Upgrade / Activate Unlimited Evaluations:");
    lines.push("  1. Contact your supervisor or program administrator.");
    lines.push("  2. In the Zigex App, administrators toggle your tuition in:");
    lines.push("     Admin Workspace › Interns › Ledger Tab › Toggle Paid [ON]");
    lines.push("  3. Run '/plan' again once updated to refresh your account status.");
  } else {
    lines.push("");
    lines.push("◈ Pro Plan Benefits:");
    lines.push("  ✔ Unlimited automated PR evaluations and feedback");
    lines.push("  ✔ Supervisor gradebook syncing & rubric scoring");
    lines.push("  ✔ Direct contributor audit ledger logging");
    lines.push("  ✔ Graduation and verified certificate eligibility");
  }

  return lines.join("\n");
}

export const planCommand: ZilaCommand = {
  name: "plan",
  aliases: ["my-plan", "subscription", "tuition"],
  description: "View your program enrollment, tuition plan, and evaluation quota",
  usage: "plan",
  category: "cohort",
  available: true,
  handler: async (_args, output: OutputCallback) => {
    const text = await formatPlanOverview();
    output("─".repeat(72), "dim");
    for (const line of text.split("\n")) {
      if (line.startsWith("◈")) {
        output(line, "info");
      } else if (line.includes("PAID") || line.includes("Paid / Verified") || line.startsWith("  ✔")) {
        output(line, "success");
      } else if (line.includes("ALERT") || line.includes("exhausted")) {
        output(line, "error");
      } else if (line.includes("FREE TRIAL") || line.includes("Unpaid") || line.startsWith("ℹ️")) {
        output(line, "warning");
      } else {
        output(line, "default");
      }
    }
    output("─".repeat(72), "dim");
  },
};
