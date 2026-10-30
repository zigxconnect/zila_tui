import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  extractSupervisorInstructions,
  findSupervisorInstructionsInFolder,
} from "../dist/utils/supervisorPromptExtractor.js";

test("extractSupervisorInstructions parses Python docstring supervisor criteria", () => {
  const code = `"""
========================================================================
SUPERVISOR INSTRUCTIONS & GRADING CRITERIA:
Task: Implement a non-blocking circular buffer for UART packets.
Requirements:
  1. Define a FixedSizeBuffer class with capacity of 64 bytes.
  2. Implement write() and read() methods handling overflow gracefully.
  3. Write unit tests covering head/tail wraparound conditions.
Weight: 2.0
========================================================================
"""

class FixedSizeBuffer:
    pass
`;

  const parsed = extractSupervisorInstructions(code);
  assert.equal(parsed.hasInstructions, true);
  assert.equal(parsed.taskDescription, "Implement a non-blocking circular buffer for UART packets.");
  assert.equal(parsed.requirements.length, 3);
  assert.equal(parsed.requirements[0], "Define a FixedSizeBuffer class with capacity of 64 bytes.");
  assert.equal(parsed.requirements[1], "Implement write() and read() methods handling overflow gracefully.");
  assert.equal(parsed.requirements[2], "Write unit tests covering head/tail wraparound conditions.");
  assert.equal(parsed.weight, 2.0);
});

test("extractSupervisorInstructions parses C-style comment blocks", () => {
  const code = `/*
Task: Build React responsive navbar
Requirements:
  - Add Hamburger toggle button
  - Add theme switcher
Weight: 1.0
*/
import React from 'react';
`;

  const parsed = extractSupervisorInstructions(code);
  assert.equal(parsed.hasInstructions, true);
  assert.equal(parsed.requirements.length, 2);
  assert.equal(parsed.requirements[0], "Add Hamburger toggle button");
  assert.equal(parsed.requirements[1], "Add theme switcher");
});

test("findSupervisorInstructionsInFolder discovers .instructions.md and in-code python docstrings", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-sup-test-"));
  try {
    // 1. In-code docstring discovery
    const pyFile = path.join(tmpDir, "exercise.py");
    fs.writeFileSync(
      pyFile,
      `"""
Task: Binary Search Tree
Requirements:
  1. Insert method
  2. Search method
Weight: 1.0
"""
class BST:
    pass
`
    );

    const fromCode = findSupervisorInstructionsInFolder(tmpDir);
    assert.equal(fromCode.hasInstructions, true);
    assert.equal(fromCode.requirements.length, 2);
    assert.equal(fromCode.requirements[0], "Insert method");

    // 2. Dedicated hidden file takes precedence
    const hiddenFile = path.join(tmpDir, ".instructions.md");
    fs.writeFileSync(
      hiddenFile,
      `# Supervisor Instructions
Task: Priority Queue with Heap
- Implement push
- Implement pop
- Handle empty queue exception
`
    );

    const fromHidden = findSupervisorInstructionsInFolder(tmpDir);
    assert.equal(fromHidden.hasInstructions, true);
    assert.equal(fromHidden.requirements.length, 3);
    assert.equal(fromHidden.requirements[0], "Implement push");
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
