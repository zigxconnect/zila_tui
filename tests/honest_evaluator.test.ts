import test from "node:test";
import assert from "node:assert/strict";
import { evaluateStudentWorkHonestly } from "../dist/utils/honestEvaluator.js";
import type { ExtractedSupervisorPrompt } from "../dist/utils/supervisorPromptExtractor.js";

test("evaluateStudentWorkHonestly returns 0 when student git diff is empty", async () => {
  const instructions: ExtractedSupervisorPrompt = {
    hasInstructions: true,
    rawHeader: "Requirements: 1. Fix bug",
    requirements: ["Fix bug"],
    weight: 1.0,
  };

  const result = await evaluateStudentWorkHonestly(instructions, "");
  assert.equal(result.score, 0.0);
  assert.equal(result.weightedScore, 0.0);
  assert.equal(result.requirementVerifications[0]?.status, "FAIL");
});

test("evaluateStudentWorkHonestly applies heuristic scoring when offline or no API key", async () => {
  const instructions: ExtractedSupervisorPrompt = {
    hasInstructions: true,
    rawHeader: "Requirements: 1. Add feature",
    requirements: ["Add feature"],
    weight: 2.0,
  };

  const mockDiff = `
+ export function addFeature() {
+   return true;
+ }
`;

  const result = await evaluateStudentWorkHonestly(instructions, mockDiff);
  assert.ok(result.score > 0.0);
  assert.ok(result.score <= 1.0);
  assert.ok(result.proposedMark >= 0.0 && result.proposedMark <= 1.0);
  assert.ok(result.weightedScore > 0.0);
  assert.ok(result.honestSummary.length > 0);
});

test("detectExerciseWorkInFolder flags empty or untouched boilerplate stubs as no work", async () => {
  const { detectExerciseWorkInFolder, isSubstantiveCodeLine } = await import("../dist/utils/antiCheatingDetector.js");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");

  // Verify substantive line helper
  assert.equal(isSubstantiveCodeLine("# comment"), false);
  assert.equal(isSubstantiveCodeLine("   // todo: implement"), false);
  assert.equal(isSubstantiveCodeLine("pass"), false);
  assert.equal(isSubstantiveCodeLine("raise NotImplementedError()"), false);
  assert.equal(isSubstantiveCodeLine("def solve():"), true);
  assert.equal(isSubstantiveCodeLine("    return x * 2"), true);

  const tempExerciseDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila_work_detect_"));
  try {
    // 1. Untouched starter template
    const solutionFile = path.join(tempExerciseDir, "solution.py");
    fs.writeFileSync(
      solutionFile,
      `"""Starter file: Implement Ring Buffer"""\n\ndef create_buffer(capacity):\n    # TODO: implement\n    pass\n`
    );

    const emptyResult = detectExerciseWorkInFolder(tempExerciseDir);
    assert.equal(emptyResult.hasWork, false);
    assert.equal(emptyResult.codeLinesCount, 0);
    assert.ok(emptyResult.summaryMessage.includes("No task was done"));

    // 2. Real implementation added
    fs.writeFileSync(
      solutionFile,
      `class RingBuffer:\n    def __init__(self, cap):\n        self.cap = cap\n        self.buf = [None] * cap\n    def push(self, item):\n        self.buf.append(item)\n`
    );

    const realResult = detectExerciseWorkInFolder(tempExerciseDir);
    assert.equal(realResult.hasWork, true);
    assert.ok(realResult.codeLinesCount >= 4);
    assert.ok(realResult.implementationFiles.includes("solution.py"));
  } finally {
    fs.rmSync(tempExerciseDir, { recursive: true, force: true });
  }
});

test("evaluateStudentWorkHonestly assigns 0.0 when detectExerciseWorkInFolder reports no work", async () => {
  const instructions: ExtractedSupervisorPrompt = {
    hasInstructions: true,
    rawHeader: "Requirements: 1. Build circular buffer\n2. Add overrun bounds",
    requirements: ["Build circular buffer", "Add overrun bounds"],
    weight: 1.5,
  };

  const emptyDetection = {
    hasWork: false,
    codeLinesCount: 0,
    implementationFiles: [],
    unmodifiedStarters: ["solution.py"],
    summaryMessage: "No task was done: Exercise files are empty or contain only untouched starter boilerplate.",
  };

  const result = await evaluateStudentWorkHonestly(instructions, "", [], undefined, emptyDetection);
  assert.equal(result.score, 0.0);
  assert.equal(result.proposedMark, 0.0);
  assert.equal(result.weightedScore, 0.0);
  assert.equal(result.whatStudentDid.includes("No task was done"), true);
  assert.equal(result.requirementVerifications.every((r) => r.status === "FAIL"), true);
  assert.ok(result.supervisorRecommendation.includes("0.0 / 1.0 mark"));
});
