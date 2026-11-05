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

test("GenerateRepo - rejects non-supervisor users", async () => {
  const { executeGenerateRepo } = await import("../dist/commands/generateRepo.js");
  const tempSpec = path.join(os.tmpdir(), `test_spec_${Date.now()}.json`);
  fs.writeFileSync(tempSpec, JSON.stringify(getSkeletonSpec()));

  try {
    const prevRole = process.env.ZILA_ROLE;
    delete process.env.ZILA_ROLE;

    const result = await executeGenerateRepo(tempSpec, { asSupervisor: false });
    assert.ok(result.includes("restricted to verified Supervisors only") || result.includes("Access denied"));

    process.env.ZILA_ROLE = prevRole;
  } finally {
    fs.rmSync(tempSpec, { force: true });
  }
});

test("GenerateRepo - checks program scoping and prevents duplicate live repos", async () => {
  const { executeGenerateRepo, isDummyRepo } = await import("../dist/commands/generateRepo.js");
  const { setActiveCohort, clearActiveCohort } = await import("../dist/utils/activeCohort.js");
  const { executeDetachRepo, detachRepoCommand } = await import("../dist/commands/detachRepo.js");

  // Verify dummy repo helper
  assert.equal(isDummyRepo("https://github.com/iws3/sample_repo_zila.git"), true);
  assert.equal(isDummyRepo("https://github.com/zigxconnect/ml_internship_live.git"), false);

  const tempSpec = path.join(os.tmpdir(), `test_spec_${Date.now()}.json`);
  fs.writeFileSync(tempSpec, JSON.stringify(getSkeletonSpec()));

  try {
    process.env.ZILA_ROLE = "supervisor";

    // 1. Without active cohort
    clearActiveCohort();
    const noCohortResult = await executeGenerateRepo(tempSpec, { asSupervisor: true });
    assert.ok(noCohortResult.includes("No cohort program selected"));

    // 2. With active cohort having a LIVE repository attached
    setActiveCohort({
      id: "cohort-test-99",
      name: "Autonomous Agents 2026",
      githubRepoUrl: "https://github.com/zigxconnect/live_agents_repo.git",
    });

    const duplicateResult = await executeGenerateRepo(tempSpec, { asSupervisor: true });
    assert.ok(duplicateResult.includes("A live repository is already active"));
    assert.ok(duplicateResult.includes("zila detach-repo"));

    // 3. With --force flag, duplicate block is bypassed
    const forceResult = await executeGenerateRepo(tempSpec, {
      asSupervisor: true,
      force: true,
      outputDir: path.join(os.tmpdir(), `zila_force_out_${Date.now()}`),
    });
    assert.ok(forceResult.includes("Successfully generated curriculum repository"));

    // 4. Detach repo unlinks the live repo
    const detachMsg = await executeDetachRepo({ asSupervisor: true });
    assert.ok(detachMsg.includes("Successfully detached repository"));

    // 5. With detachRepoCommand metadata
    assert.equal(detachRepoCommand.name, "detach-repo");
    assert.ok(detachRepoCommand.aliases.includes("unlink-repo"));
  } finally {
    clearActiveCohort();
    fs.rmSync(tempSpec, { force: true });
  }
});
