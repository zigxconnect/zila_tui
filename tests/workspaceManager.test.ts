import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  listWorkspaceFiles,
  readWorkspaceFile,
  saveWorkspaceFile,
  resolveSupervisorRepo,
  isCriticalFile,
} from "../dist/utils/workspaceManager.js";

test("workspaceManager - lists, reads, and saves workspace files", async () => {
  const tempDir = path.join(os.tmpdir(), `zila-workspace-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const subDir = path.join(tempDir, "beginner", "1_python", "day_1");
  fs.mkdirSync(subDir, { recursive: true });

  const exerciseFile = path.join(subDir, "exercise.md");
  fs.writeFileSync(exerciseFile, "# Day 1: Python Fundamentals\nWrite a function.", "utf8");

  // List root
  const rootEntries = listWorkspaceFiles(tempDir);
  assert.ok(rootEntries.length >= 1, "Should list beginner directory");
  assert.strictEqual(rootEntries[0]?.name, "beginner/");
  assert.strictEqual(rootEntries[0]?.isDir, true);

  // List subDir
  const subEntries = listWorkspaceFiles(tempDir, "beginner/1_python/day_1");
  assert.strictEqual(subEntries.length, 1);
  assert.strictEqual(subEntries[0]?.name, "exercise.md");
  assert.strictEqual(subEntries[0]?.isDir, false);

  // Read file
  const readRes = readWorkspaceFile(exerciseFile);
  assert.strictEqual(readRes.success, true);
  assert.ok(readRes.content.includes("Day 1: Python Fundamentals"));
  assert.strictEqual(readRes.lines, 2);

  // Save edit
  const updatedContent = "# Day 1: Python Fundamentals\nWrite a function.\n# Solution implemented.";
  const saveRes = saveWorkspaceFile(exerciseFile, updatedContent);
  assert.strictEqual(saveRes.success, true);

  const reRead = readWorkspaceFile(exerciseFile);
  assert.ok(reRead.content.includes("# Solution implemented."));
  assert.strictEqual(reRead.lines, 3);

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("workspaceManager - critical files access control for students vs supervisors", async () => {
  // 1. Check isCriticalFile pattern matching
  assert.strictEqual(isCriticalFile("grading.yml"), true);
  assert.strictEqual(isCriticalFile("grading.yaml"), true);
  assert.strictEqual(isCriticalFile("solution.py"), true);
  assert.strictEqual(isCriticalFile("solutions/day_1.py"), true);
  assert.strictEqual(isCriticalFile(".supervisor_rubric.md"), true);
  assert.strictEqual(isCriticalFile(".env"), true);
  assert.strictEqual(isCriticalFile(".env.production"), true);
  assert.strictEqual(isCriticalFile("credentials.json"), true);
  assert.strictEqual(isCriticalFile("server.key"), true);

  // Regular student files must NOT be flagged critical
  assert.strictEqual(isCriticalFile("exercise.md"), false);
  assert.strictEqual(isCriticalFile("README.md"), false);
  assert.strictEqual(isCriticalFile("contributors/jane/exercise.py"), false);
  assert.strictEqual(isCriticalFile("script.py"), false);

  // 2. Setup mock directory with both student and critical supervisor files
  const tempDir = path.join(os.tmpdir(), `zila-security-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const studentFile = path.join(tempDir, "exercise.md");
  fs.writeFileSync(studentFile, "# Exercise", "utf8");

  const supervisorFile = path.join(tempDir, "grading.yml");
  fs.writeFileSync(supervisorFile, "rubric:\n  points: 100", "utf8");

  const solutionFile = path.join(tempDir, "solution.py");
  fs.writeFileSync(solutionFile, "def solve(): return 42", "utf8");

  // 3. Test listWorkspaceFiles visibility
  const studentList = listWorkspaceFiles(tempDir, "", false); // student
  const studentFileNames = studentList.map((f) => f.name);
  assert.ok(studentFileNames.includes("exercise.md"), "Student should see exercise.md");
  assert.ok(!studentFileNames.includes("grading.yml"), "Student should NOT see grading.yml");
  assert.ok(!studentFileNames.includes("solution.py"), "Student should NOT see solution.py");

  const supervisorList = listWorkspaceFiles(tempDir, "", true); // supervisor
  const supervisorFileNames = supervisorList.map((f) => f.name);
  assert.ok(supervisorFileNames.includes("exercise.md"), "Supervisor should see exercise.md");
  assert.ok(supervisorFileNames.includes("grading.yml"), "Supervisor should see grading.yml");
  assert.ok(supervisorFileNames.includes("solution.py"), "Supervisor should see solution.py");

  // 4. Test readWorkspaceFile protection
  const studentReadSupervisor = readWorkspaceFile(supervisorFile, 100, false);
  assert.strictEqual(studentReadSupervisor.success, false);
  assert.ok(studentReadSupervisor.error?.includes("Access Denied"));

  const supervisorReadSupervisor = readWorkspaceFile(supervisorFile, 100, true);
  assert.strictEqual(supervisorReadSupervisor.success, true);
  assert.ok(supervisorReadSupervisor.content.includes("rubric:"));

  // 5. Test saveWorkspaceFile protection
  const studentSaveSupervisor = saveWorkspaceFile(supervisorFile, "hacked", false);
  assert.strictEqual(studentSaveSupervisor.success, false);
  assert.ok(studentSaveSupervisor.error?.includes("Access Denied"));

  const supervisorSaveSupervisor = saveWorkspaceFile(supervisorFile, "rubric:\n  updated: true", true);
  assert.strictEqual(supervisorSaveSupervisor.success, true);

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("workspaceManager - resolveSupervisorRepo returns valid fallback repo structure", async () => {
  const info = await resolveSupervisorRepo();
  assert.ok(info.repoName.length > 0, "Repo name should not be empty");
  assert.ok(info.repoUrl.startsWith("https://github.com/"), "Repo URL should be HTTPS GitHub");
  assert.ok(typeof info.isCloned === "boolean");
  assert.ok(info.branch.length > 0);
});
