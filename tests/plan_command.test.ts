import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

process.env.ZILA_CONFIG_DIR = path.join(process.cwd(), ".zila_test_plan");

import { planCommand, formatPlanOverview } from "../dist/commands/plan.js";
import { setActiveCohort, clearActiveCohort } from "../dist/utils/activeCohort.js";

test("PlanCommand - command metadata and registration", () => {
  assert.equal(planCommand.name, "plan");
  assert.ok(planCommand.aliases?.includes("my-plan"));
  assert.ok(planCommand.aliases?.includes("subscription"));
  assert.ok(planCommand.aliases?.includes("tuition"));
  assert.equal(planCommand.available, true);
});

test("PlanCommand - formats fallback when no cohort selected", async () => {
  clearActiveCohort();
  const text = await formatPlanOverview();
  assert.ok(text.includes("No active program or cohort selected"));
  assert.ok(text.includes("select --cohorts"));
});

test("PlanCommand - formats free trial tier with available evaluations", async () => {
  setActiveCohort({
    id: "cohort-trial-1",
    name: "Summer 2026 AI Residency",
    department: "ml",
    level: "advanced",
    supervisorName: "Dr. Alex Turing",
    supervisorEmail: "alex@zigex.io",
    githubRepoUrl: "https://github.com/zigex-ai/residency-2026.git",
    isPaid: false,
    tasksSubmittedCount: 2,
    freeTasksMax: 5,
    freeTasksRemaining: 3,
  });

  const lines: string[] = [];
  const output = (msg: string) => lines.push(msg);

  await planCommand.handler([], output);

  const fullOutput = lines.join("\n");
  assert.ok(fullOutput.includes("Summer 2026 AI Residency"));
  assert.ok(fullOutput.includes("Dr. Alex Turing"));
  assert.ok(fullOutput.includes("FREE TRIAL (5 Tasks Free Evaluation)"));
  assert.ok(fullOutput.includes("Unpaid / Trial"));
  assert.ok(fullOutput.includes("2/5 evaluations used (3 remaining)"));
  assert.ok(fullOutput.includes("Admin Workspace › Interns › Ledger Tab › Toggle Paid [ON]"));
});

test("PlanCommand - warns when free trial quota is exhausted", async () => {
  setActiveCohort({
    id: "cohort-trial-2",
    name: "FinTech Web Fullstack Bootcamp",
    department: "web",
    level: "intermediate",
    supervisorName: "Sarah Connor",
    supervisorEmail: "sarah@zigex.io",
    isPaid: false,
    tasksSubmittedCount: 5,
    freeTasksMax: 5,
    freeTasksRemaining: 0,
  });

  const text = await formatPlanOverview();
  assert.ok(text.includes("ALERT: Free trial evaluation quota exhausted (5/5 used)"));
  assert.ok(text.includes("Automated PR evaluation is paused for this cohort until tuition is paid"));
});

test("PlanCommand - formats paid pro plan with unlimited evaluations", async () => {
  setActiveCohort({
    id: "cohort-paid-1",
    name: "Cybersecurity Red Team Immersion",
    department: "cyber",
    level: "advanced",
    supervisorName: "Marcus Vance",
    supervisorEmail: "marcus@zigex.io",
    githubRepoUrl: "https://github.com/zigex-cyber/redteam-ops.git",
    isPaid: true,
    tasksSubmittedCount: 12,
  });

  const lines: string[] = [];
  const output = (msg: string) => lines.push(msg);

  await planCommand.handler([], output);

  const fullOutput = lines.join("\n");
  assert.ok(fullOutput.includes("Cybersecurity Red Team Immersion"));
  assert.ok(fullOutput.includes("PRO / FULL ACCESS (Tuition Settled)"));
  assert.ok(fullOutput.includes("Paid / Verified"));
  assert.ok(fullOutput.includes("Unlimited automated PR reviews & evaluations"));
  assert.ok(fullOutput.includes("Graduation and verified certificate eligibility"));
  assert.ok(!fullOutput.includes("ALERT: Free trial"));
});
