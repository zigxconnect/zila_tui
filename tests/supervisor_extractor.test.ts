import test from "node:test";
import assert from "node:assert/strict";
import { extractSupervisorInstructions } from "../dist/utils/supervisorPromptExtractor.js";

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
