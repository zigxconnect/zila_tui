import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { enrichContributorLogbook } from "../dist/utils/logbookEnricher.js";

test("enrichContributorLogbook creates contributor directory and appends formatted entry", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-logbook-test-"));

  const payload = {
    username: "john_doe",
    taskTitle: "Day 01: Circular Buffer Implementation",
    prUrl: "https://github.com/iws3/sample_repo_zila/pull/15",
    evaluation: {
      score: 0.9,
      weightedScore: 1.8,
      honestSummary: "Implemented circular buffer with non-blocking read/write.",
      requirementVerifications: [
        { requirement: "FixedSizeBuffer class", status: "PASS" as const, explanation: "Defined with 64 byte capacity." },
        { requirement: "Wraparound handling", status: "PASS" as const, explanation: "Passed head & tail tests." },
      ],
      supervisorRecommendation: "Merge approved.",
    },
    repoRoot: tempDir,
  };

  const res = enrichContributorLogbook(payload);
  assert.equal(res.appended, true);
  assert.ok(fs.existsSync(res.filePath));

  const content = fs.readFileSync(res.filePath, "utf8");
  assert.ok(content.includes("john_doe"));
  assert.ok(content.includes("Day 01: Circular Buffer Implementation"));
  assert.ok(content.includes("90%"));
  assert.ok(content.includes("FixedSizeBuffer class"));

  fs.rmSync(tempDir, { recursive: true, force: true });
});
