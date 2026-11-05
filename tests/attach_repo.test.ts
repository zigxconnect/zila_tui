import test from "node:test";
import assert from "node:assert/strict";
import { attachRepoCommand } from "../dist/commands/attachRepo.js";

test("AttachRepoCommand - registers properly with required aliases and category", () => {
  assert.equal(attachRepoCommand.name, "attach-repo");
  assert.equal(attachRepoCommand.aliases.includes("cohort-repo"), true);
  assert.equal(attachRepoCommand.aliases.includes("link-repo"), true);
  assert.equal(attachRepoCommand.category, "zask");
  assert.equal(attachRepoCommand.available, true);
});

test("AttachRepoCommand - prints usage when no repo URL is supplied", async () => {
  let outputText = "";
  let outputStyle = "";
  await attachRepoCommand.handler([], (text, style) => {
    outputText += text + "\n";
    if (style) outputStyle = style;
  });

  assert.equal(outputText.includes("Usage: zila attach-repo"), true);
  assert.equal(outputText.includes("<githubRepoUrl>"), true);
});
