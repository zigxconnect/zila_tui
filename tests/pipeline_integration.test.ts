import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { processLocalTaskEvaluation } from "../dist/utils/pipelineIntegrator.js";

test("processLocalTaskEvaluation parses code, evaluates diff heuristic and enriches logbook", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-pipeline-test-"));

  const sampleExerciseCode = `"""
SUPERVISOR INSTRUCTIONS & GRADING CRITERIA:
Task: Build telemetry logging subsystem
Requirements:
  1. Initialize ring buffer
  2. Implement packet serialization
Weight: 1.5
"""

def initialize_buffer():
    return []
`;

  const result = await processLocalTaskEvaluation(
    "intern_coder",
    "Telemetry Logging Subsystem",
    sampleExerciseCode,
    tempDir,
  );

  assert.ok(result.evaluation);
  assert.ok(result.evaluation.score >= 0.0);
  assert.ok(result.evaluation.weightedScore >= 0.0);
  assert.equal(result.logbookAppended, true);
  assert.ok(fs.existsSync(result.logbookPath));

  const logbookData = fs.readFileSync(result.logbookPath, "utf8");
  assert.ok(logbookData.includes("intern_coder"));
  assert.ok(logbookData.includes("Telemetry Logging Subsystem"));

  fs.rmSync(tempDir, { recursive: true, force: true });
});
