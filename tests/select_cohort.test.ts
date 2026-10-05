import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

process.env.ZILA_CONFIG_DIR = path.join(process.cwd(), ".zila_test_select");

import { selectCohortCommand } from "../dist/commands/selectCohort.js";
import { getActiveCohort, setActiveCohort, clearActiveCohort } from "../dist/utils/activeCohort.js";
import { parseGitHubRepoUrl } from "../dist/utils/githubPrAutomation.js";

test("SelectCohortCommand - command metadata and aliases", () => {
  assert.equal(selectCohortCommand.name, "select");
  assert.ok(selectCohortCommand.aliases?.includes("select-cohort"));
  assert.ok(selectCohortCommand.aliases?.includes("use-cohort"));
  assert.ok(selectCohortCommand.aliases?.includes("use"));
  assert.equal(selectCohortCommand.available, true);
});

test("SelectCohortCommand - clear and current options", async () => {
  setActiveCohort({
    id: "cohort-unit-test",
    name: "Web Development Bootcamp",
    department: "web",
    level: "intermediate",
    githubRepoUrl: "https://github.com/custom-org/cohort-web.git",
  });

  const lines: string[] = [];
  const output = (msg: string) => lines.push(msg);

  // Check current
  await selectCohortCommand.handler(["--current"], output);
  assert.ok(lines.some((l) => l.includes("Web Development Bootcamp")));
  assert.ok(lines.some((l) => l.includes("web-dev")));

  // Clear
  lines.length = 0;
  await selectCohortCommand.handler(["--clear"], output);
  assert.equal(getActiveCohort(), null);
  assert.ok(lines.some((l) => l.includes("cleared")));
});

test("GitHub Automation - parseGitHubRepoUrl handles diverse repo URLs", () => {
  const parsed1 = parseGitHubRepoUrl("https://github.com/company-org/cohort-repo.git");
  assert.equal(parsed1.owner, "company-org");
  assert.equal(parsed1.repo, "cohort-repo");

  const parsed2 = parseGitHubRepoUrl("https://github.com/supervisor/cyber_exercises");
  assert.equal(parsed2.owner, "supervisor");
  assert.equal(parsed2.repo, "cyber_exercises");

  const parsedDefault = parseGitHubRepoUrl(undefined);
  assert.equal(parsedDefault.owner, "iws3");
  assert.equal(parsedDefault.repo, "sample_repo_zila");
});
