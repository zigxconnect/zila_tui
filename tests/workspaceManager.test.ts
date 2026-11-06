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

test("workspaceManager - resolveSupervisorRepo returns valid fallback repo structure", async () => {
  const info = await resolveSupervisorRepo();
  assert.ok(info.repoName.length > 0, "Repo name should not be empty");
  assert.ok(info.repoUrl.startsWith("https://github.com/"), "Repo URL should be HTTPS GitHub");
  assert.ok(typeof info.isCloned === "boolean");
  assert.ok(info.branch.length > 0);
});
