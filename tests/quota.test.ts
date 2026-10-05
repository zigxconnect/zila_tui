import { test } from "node:test";
import assert from "node:assert/strict";
import { quotaCommand } from "../dist/commands/quota.js";
import { resetLocalQuota, checkDailyPrQuota } from "../dist/utils/githubPrAutomation.js";

test("Quota Command - registers properly with aliases", () => {
  assert.equal(quotaCommand.name, "quota");
  assert.ok(quotaCommand.aliases?.includes("reset-quota"));
  assert.ok(quotaCommand.aliases?.includes("pr-quota"));
});

test("Quota Command - executes reset flag and prints confirmation", async () => {
  const outputs: string[] = [];
  await quotaCommand.handler(["--reset"], (msg) => outputs.push(msg));
  assert.ok(outputs.some((o) => o.includes("reset successfully")));
});

test("Quota Command - prints quota summary without flags", async () => {
  const outputs: string[] = [];
  await quotaCommand.handler([], (msg) => outputs.push(msg));
  assert.ok(outputs.some((o) => o.includes("daily pr submission quota")));
  assert.ok(outputs.some((o) => o.includes("Daily Limit:")));
});
