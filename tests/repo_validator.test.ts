import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import {
  validateFileListAgainstPrototype,
  validateLocalRepoPath,
  validateRemoteGitHubRepo,
} from "../dist/utils/repoStructureValidator.js";

test("Repo Validator - passes prototype structure matching sample_repo_zila", () => {
  const sampleFiles = [
    "beginner/1_python/day_1/README.md",
    "beginner/1_python/day_1/exercise.py",
    "beginner/1_python/day_2/README.md",
    "beginner/1_python/day_2/exercise.py",
    "intermediate/1_deep_learning/day_1/README.md",
    "intermediate/1_deep_learning/day_1/main.py",
    "templates/exercise.md",
    "contributors/.gitkeep",
    "beginner/1_python/day_1/.supervisor_instructions",
  ];

  const result = validateFileListAgainstPrototype(
    sampleFiles,
    "https://github.com/iws3/sample_repo_zila.git",
    "iws3",
    "sample_repo_zila",
    "main",
  );

  assert.equal(result.valid, true);
  assert.equal(result.score >= 80, true);
  assert.equal(result.checks.hasTracksOrModules, true);
  assert.equal(result.checks.hasDayFolders, true);
  assert.equal(result.checks.hasExerciseCodeFiles, true);
  assert.equal(result.checks.hasTemplate, true);
  assert.equal(result.checks.hasContributorsDir, true);
  assert.equal(result.checks.hasSupervisorInstructions, true);
  assert.equal(result.exerciseLanguagesSummary.python >= 3, true);
  assert.equal(result.exerciseLanguagesSummary.markdown >= 3, true);
});

test("Repo Validator - detects web course files (.js, .html, .ts, .md)", () => {
  const webCourseFiles = [
    "beginner/1_web_basics/day_1/index.html",
    "beginner/1_web_basics/day_1/styles.css",
    "beginner/1_web_basics/day_1/app.js",
    "beginner/1_web_basics/day_1/README.md",
    "intermediate/2_fullstack/day_1/server.ts",
    "intermediate/2_fullstack/day_1/README.md",
    "templates/exercise.md",
    "contributors/student1/day_1/exercise.md",
  ];

  const result = validateFileListAgainstPrototype(
    webCourseFiles,
    "https://github.com/org/web-curriculum.git",
    "org",
    "web-curriculum",
  );

  assert.equal(result.valid, true);
  assert.equal(result.exerciseLanguagesSummary.html >= 1, true);
  assert.equal(result.exerciseLanguagesSummary.javascript >= 2, true);
  assert.equal(result.exerciseLanguagesSummary.markdown >= 2, true);
  assert.equal(result.checks.hasExerciseCodeFiles, true);
});

test("Repo Validator - flags missing template and contributors directory with helpful warnings", () => {
  const incompleteFiles = [
    "beginner/1_python/day_1/exercise.py",
    "beginner/1_python/day_2/exercise.py",
  ];

  const result = validateFileListAgainstPrototype(
    incompleteFiles,
    "https://github.com/org/incomplete-repo.git",
    "org",
    "incomplete-repo",
  );

  assert.equal(result.checks.hasTemplate, false);
  assert.equal(result.checks.hasContributorsDir, false);
  assert.equal(result.warnings.some((w) => w.includes("templates/exercise.md")), true);
  assert.equal(result.warnings.some((w) => w.includes("contributors/")), true);
});

test("Repo Validator - rejects non-curriculum random repository", () => {
  const randomFiles = [
    "src/index.js",
    "package.json",
    "README.md",
    ".gitignore",
  ];

  const result = validateFileListAgainstPrototype(
    randomFiles,
    "https://github.com/user/simple-app.git",
    "user",
    "simple-app",
  );

  assert.equal(result.valid, false);
  assert.equal(result.checks.hasTracksOrModules, false);
  assert.equal(result.checks.hasDayFolders, false);
  assert.equal(result.errors.length > 0, true);
});

test("Repo Validator - scans cloned sample_repo_zila from local disk", () => {
  const localSamplePath = "/home/gita/.gemini/antigravity/brain/fb67f7f6-a843-412a-a3a1-9b38cee4efb4/scratch/sample_repo_zila";
  if (fs.existsSync(localSamplePath)) {
    const result = validateLocalRepoPath(localSamplePath);
    assert.equal(result.valid, true);
    assert.equal(result.detectedTracks.includes("beginner"), true);
    assert.equal(result.detectedTracks.includes("intermediate"), true);
    assert.equal(result.detectedTracks.includes("advanced"), true);
    assert.equal(result.checks.hasTemplate, true);
    assert.equal(result.checks.hasContributorsDir, true);
  }
});
