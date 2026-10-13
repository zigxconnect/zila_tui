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
  assert.ok(result.weightedScore > 0.0);
  assert.ok(result.honestSummary.length > 0);
});
