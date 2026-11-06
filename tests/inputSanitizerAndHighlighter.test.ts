import { test } from "node:test";
import assert from "node:assert";
import {
  isMouseOrControlSequence,
  cleanTypedInput,
} from "../dist/utils/terminalInputSanitizer.js";
import {
  tokenizeCodeLine,
  VSCODE_DARK,
} from "../dist/utils/codeHighlighter.js";

test("terminalInputSanitizer - detects and filters out SGR mouse escape sequences", () => {
  // SGR full sequences
  assert.strictEqual(isMouseOrControlSequence("\x1b[<32;127;13M"), true);
  assert.strictEqual(isMouseOrControlSequence("\x1b[<0;128;13m"), true);
  assert.strictEqual(isMouseOrControlSequence("\x1b[<64;50;10M"), true);

  // Partial fragments (like what was leaked in screenshot)
  assert.strictEqual(isMouseOrControlSequence("[<32;127;13M"), true);
  assert.strictEqual(isMouseOrControlSequence("126;13M"), true);
  assert.strictEqual(isMouseOrControlSequence("32;127;13M"), true);

  // Regular typing must NOT be flagged as mouse or control sequences
  assert.strictEqual(isMouseOrControlSequence("hello"), false);
  assert.strictEqual(isMouseOrControlSequence("def solve():"), false);
  assert.strictEqual(isMouseOrControlSequence("12345"), false);
  assert.strictEqual(isMouseOrControlSequence("/code"), false);
  assert.strictEqual(isMouseOrControlSequence("x = a + b"), false);
});

test("terminalInputSanitizer - cleanTypedInput strips mouse noise and preserves valid input", () => {
  // Clean normal text
  assert.strictEqual(cleanTypedInput("hello world"), "hello world");
  assert.strictEqual(cleanTypedInput("x = 10"), "x = 10");

  // Filter out mouse tracking flood
  assert.strictEqual(cleanTypedInput("\x1b[<32;127;13M"), "");
  assert.strictEqual(cleanTypedInput("[<32;127;13M"), "");
  assert.strictEqual(cleanTypedInput("126;13M"), "");
  assert.strictEqual(cleanTypedInput("\x1b[<32;127;13M[<32;128;13M"), "");

  // Strips mouse sequences even if mixed with text
  assert.strictEqual(cleanTypedInput("\x1b[<32;127;13Mabc"), "abc");
});

test("codeHighlighter - tokenizes Python code with VS Code Dark+ palette", () => {
  const line = 'def solve(n: int) -> int: # calculate';
  const tokens = tokenizeCodeLine(line, "exercise.py");

  assert.ok(tokens.length >= 4);

  // def is keyword
  const defToken = tokens.find((t) => t.text === "def");
  assert.ok(defToken);
  assert.strictEqual(defToken?.color, VSCODE_DARK.keyword);

  // int is builtin/type
  const intToken = tokens.find((t) => t.text === "int");
  assert.ok(intToken);
  assert.strictEqual(intToken?.color, VSCODE_DARK.builtin);

  // comment is green
  const commentToken = tokens.find((t) => t.text.includes("# calculate"));
  assert.ok(commentToken);
  assert.strictEqual(commentToken?.color, VSCODE_DARK.comment);
});

test("codeHighlighter - tokenizes Markdown with headings and bullets", () => {
  const headingTokens = tokenizeCodeLine("# Exercise 1", "README.md");
  assert.strictEqual(headingTokens.length, 1);
  assert.strictEqual(headingTokens[0]?.color, VSCODE_DARK.mdHeading);

  const bulletTokens = tokenizeCodeLine("- First item", "README.md");
  assert.ok(bulletTokens.length >= 2);
  const bullet = bulletTokens.find((t) => t.text === "- ");
  assert.ok(bullet);
  assert.strictEqual(bullet?.color, VSCODE_DARK.mdBullet);
});
