import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  type CurriculumSpec,
  validateCurriculumSpec,
  generateLocalCurriculumRepo,
} from "../dist/utils/curriculumRepoGenerator.js";
import { validateLocalRepoPath } from "../dist/utils/repoStructureValidator.js";
import { generateRepoCommand, getSkeletonSpec } from "../dist/commands/generateRepo.js";

test("Curriculum Generator - validates full compliant spec", () => {
  const spec = getSkeletonSpec("Acme Corp", "Fullstack Web", "Batch 1");
  const errors = validateCurriculumSpec(spec);
  assert.equal(errors.length, 0);
});

test("Curriculum Generator - catches missing required tracks", () => {
  const badSpec: CurriculumSpec = {
    organization: "Test Org",
    cohort: "Test Cohort",
    domain: "Test Domain",
    tracks: [{ name: "beginner", modules: [] }],
  };
  const errors = validateCurriculumSpec(badSpec);
  assert.equal(errors.some((e) => e.includes("intermediate")), true);
  assert.equal(errors.some((e) => e.includes("advanced")), true);
});

test("Curriculum Generator - generates complete prototype structure conforming 100% to validator", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-curr-test-"));
  try {
    const spec = getSkeletonSpec("Zigex Corp", "Autonomous Agents", "Batch 2026");
    const { totalDays, outputPath } = generateLocalCurriculumRepo(spec, tempDir);

    assert.equal(totalDays >= 3, true);
    assert.equal(fs.existsSync(path.join(outputPath, "README.md")), true);
    assert.equal(fs.existsSync(path.join(outputPath, "cohort.json")), true);
    assert.equal(fs.existsSync(path.join(outputPath, ".gitignore")), true);
    assert.equal(fs.existsSync(path.join(outputPath, "templates", "exercise.md")), true);
    assert.equal(fs.existsSync(path.join(outputPath, "contributors", ".gitkeep")), true);

    // Validate generated repo using the repoStructureValidator
    const validation = validateLocalRepoPath(outputPath);
    assert.equal(validation.valid, true);
    assert.equal(validation.score >= 80, true);
    assert.equal(validation.checks.hasTracksOrModules, true);
    assert.equal(validation.checks.hasDayFolders, true);
    assert.equal(validation.checks.hasExerciseCodeFiles, true);
    assert.equal(validation.checks.hasTemplate, true);
    assert.equal(validation.checks.hasContributorsDir, true);
    assert.equal(validation.checks.hasSupervisorInstructions, true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("GenerateRepoCommand - command metadata and usage prompt", async () => {
  assert.equal(generateRepoCommand.name, "generate-repo");
  assert.equal(generateRepoCommand.aliases.includes("create-curriculum"), true);

  let outputText = "";
  await generateRepoCommand.handler([], (msg) => {
    outputText += msg + "\n";
  });
  assert.equal(outputText.includes("Usage: zila generate-repo"), true);
  assert.equal(outputText.includes("--push"), true);
  assert.equal(outputText.includes("--init"), true);
});
