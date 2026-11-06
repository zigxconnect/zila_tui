import test from "node:test";
import assert from "node:assert/strict";
import { formatTerminalText } from "../dist/utils/terminalTextFormatter.js";

test("formatTerminalText removes markdown bold, headers, backticks, and bullet points", () => {
  const input = `### Implementation Guide
Here is **important** code with \`inline_var\` and [docs link](https://zigexconnect.com).
* Step 1: Initialize
* Step 2: Test
\`\`\`typescript
const x = 10;
\`\`\``;

  const formatted = formatTerminalText(input);

  assert.ok(!formatted.includes("###"), "Headers stripped");
  assert.ok(formatted.includes("◈ IMPLEMENTATION GUIDE"), "Converted header present");
  assert.ok(!formatted.includes("**important**"), "Bold syntax stripped");
  assert.ok(formatted.includes("important"), "Word preserved");
  assert.ok(!formatted.includes("`inline_var`"), "Backticks stripped");
  assert.ok(formatted.includes("inline_var"), "Inline code preserved");
  assert.ok(formatted.includes("docs link (https://zigexconnect.com)"), "Link formatted cleanly");
  assert.ok(formatted.includes("› Step 1: Initialize"), "Bullet converted to chevron");
  assert.ok(!formatted.includes("```"), "Code fences stripped");
  assert.ok(formatted.includes("  const x = 10;"), "Code block indented");
});
