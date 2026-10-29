import test from "node:test";
import assert from "node:assert/strict";
import { checkEnvironmentDependencies } from "../dist/utils/dependencyChecker.js";
import { getInstallPlan } from "../dist/utils/dependencyInstaller.js";

test("checkEnvironmentDependencies returns structured diagnostics for node, python and git", () => {
  const diagnostics = checkEnvironmentDependencies();

  assert.ok(typeof diagnostics.allInstalled === "boolean");
  assert.ok(diagnostics.node);
  assert.ok(diagnostics.python);
  assert.ok(diagnostics.git);

  // In test environment, node must be installed
  assert.equal(diagnostics.node.installed, true);
  assert.ok(diagnostics.node.version?.startsWith("v"));
  assert.equal(diagnostics.node.required, ">= 20.19.0");

  // Git is installed in standard Linux dev environment
  assert.equal(diagnostics.git.installed, true);
  assert.equal(diagnostics.git.command, "git");
});

test("getInstallPlan produces valid installation plans for different targets", () => {
  const planNode = getInstallPlan("node");
  const planPython = getInstallPlan("python");
  const planGit = getInstallPlan("git");
  const planAll = getInstallPlan("all");

  assert.ok(planNode.command.length > 0);
  assert.ok(planPython.command.length > 0);
  assert.ok(planGit.command.length > 0);
  assert.ok(planAll.command.length > 0);
});
