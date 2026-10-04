import test from "node:test";
import assert from "node:assert/strict";
import {
  generateExerciseReport,
  DAY_WEIGHTS,
  checkDailyPrQuota,
  SAMPLE_COHORT_REPO,
  type TaskSubmissionPayload,
} from "../dist/utils/githubPrAutomation.js";
import { registerAllCommands } from "../dist/commands/index.js";
import { findCommand } from "../dist/commands/registry.js";
import { submitTaskCommand } from "../dist/commands/zask.js";

registerAllCommands();

test("PR Automation - Normalization of day weights over 100", () => {
  assert.equal(DAY_WEIGHTS[1]?.weight, 1);
  assert.equal(DAY_WEIGHTS[1]?.percentage, 12.5);

  assert.equal(DAY_WEIGHTS[2]?.weight, 1);
  assert.equal(DAY_WEIGHTS[2]?.percentage, 12.5);

  assert.equal(DAY_WEIGHTS[3]?.weight, 2);
  assert.equal(DAY_WEIGHTS[3]?.percentage, 25.0);

  assert.equal(DAY_WEIGHTS[4]?.weight, 4);
  assert.equal(DAY_WEIGHTS[4]?.percentage, 50.0);

  const totalPct = Object.values(DAY_WEIGHTS).reduce((sum, d) => sum + d.percentage, 0);
  assert.equal(totalPct, 100.0);
});

test("PR Automation - Exercise report generation matches cohort rubric", () => {
  const payload: TaskSubmissionPayload = {
    level: "beginner",
    module: "1_python",
    day: 1,
    summary: "Built basic CLI data processor and unit tests",
    practicalsDescription: "Implemented pandas data extraction pipeline with error handling",
    challenges: "Handling sparse matrices and memory footprint",
    deploymentUrl: "https://demo.zigex.dev/intern-eda",
  };

  const report = generateExerciseReport(payload, "octocat", "1_python/octocat/day-1");

  assert.ok(report.includes("# Daily Cohort Exercise Report — Day 01"));
  assert.ok(report.includes("@octocat"));
  assert.ok(report.includes("`1_python/octocat/day-1`"));
  assert.ok(report.includes("Built basic CLI data processor"));
  assert.ok(report.includes("Handling sparse matrices"));
  assert.ok(report.includes(SAMPLE_COHORT_REPO));
  assert.ok(report.includes("1 point(s)"));
  assert.ok(report.includes("12.5% (Normalized over 100)"));
});

test("PR Automation - Daily PR submission quota evaluation", () => {
  const quota = checkDailyPrQuota();
  assert.ok(typeof quota.allowed === "boolean");
  assert.ok(quota.remainingToday >= 0 && quota.remainingToday <= 2);
  assert.ok(quota.message.includes("quota") || quota.message.includes("Quota"));
});

test("PR Automation - submit-task command and zila-submit alias", () => {
  assert.equal(submitTaskCommand.name, "submit-task");
  assert.ok(submitTaskCommand.aliases?.includes("zila-submit"));
  assert.ok(submitTaskCommand.aliases?.includes("task-submit"));

  const registered = findCommand("submit-task");
  assert.ok(registered);
  const alias = findCommand("zila-submit");
  assert.ok(alias);
});
