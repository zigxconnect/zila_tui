import test from "node:test";
import assert from "node:assert/strict";
import {
  generateExerciseReport,
  DAY_WEIGHTS,
  checkDailyPrQuota,
  getTrackModules,
  getAvailableDomains,
  resetLocalQuota,
  isValidHttpUrl,
  sanitizePathComponent,
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

  const report = generateExerciseReport(payload, "octocat", "1_python/octocat/day_1");

  assert.ok(report.includes("# Daily Cohort Exercise Report — Day 01"));
  assert.ok(report.includes("@octocat"));
  assert.ok(report.includes("`1_python/octocat/day_1`"));
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

test("PR Automation - Curriculum track module resolution", () => {
  const beginner = getTrackModules("beginner");
  assert.ok(beginner.includes("1_python"));
  assert.ok(beginner.includes("2_eda_and_classical_ml"));

  const intermediate = getTrackModules("intermediate");
  assert.ok(intermediate.includes("1_deeplearning_and_neural_nets"));

  const advance = getTrackModules("advance");
  assert.ok(advance.includes("1_generative_ai_and_agents"));

  // Fallback
  const unknown = getTrackModules("nonexistent");
  assert.ok(unknown.length > 0);
});

test("PR Automation - Local daily quota reset utility", () => {
  resetLocalQuota();
  const quota = checkDailyPrQuota();
  assert.equal(quota.allowed, true);
  assert.equal(quota.countToday, 0);
  assert.equal(quota.remainingToday, 2);
});

test("PR Automation - HTTP URL validation helper", () => {
  assert.equal(isValidHttpUrl("https://github.com/iws3/sample_repo_zila"), true);
  assert.equal(isValidHttpUrl("http://localhost:3000"), true);
  assert.equal(isValidHttpUrl("not-a-url"), false);
  assert.equal(isValidHttpUrl(""), false);
});

test("PR Automation - Multi-domain support (Web, Cyber, Embedded, Mobile, Cloud)", () => {
  const domains = getAvailableDomains();
  const domainIds = domains.map((d) => d.id);
  assert.ok(domainIds.includes("ml"));
  assert.ok(domainIds.includes("web"));
  assert.ok(domainIds.includes("cyber"));
  assert.ok(domainIds.includes("embeded"));
  assert.ok(domainIds.includes("app"));
  assert.ok(domainIds.includes("cloud"));

  const webModules = getTrackModules("beginner", "web");
  assert.ok(webModules.includes("1_html_css_javascript"));

  const cyberModules = getTrackModules("intermediate", "cyber");
  assert.ok(cyberModules.includes("1_penetration_testing_and_soc"));

  const embededModules = getTrackModules("advance", "embeded");
  assert.ok(embededModules.includes("1_tinyml_and_edge_computing"));

  const appModules = getTrackModules("beginner", "app");
  assert.ok(appModules.includes("1_mobile_ui_and_dart_flutter"));

  const sanitized = sanitizePathComponent("Web App / React & Native!!");
  assert.equal(sanitized, "web_app_react_native");
});
