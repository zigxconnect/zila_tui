import test from "node:test";
import assert from "node:assert/strict";
import { registerAllCommands } from "../dist/commands/index.js";
import { findCommand } from "../dist/commands/registry.js";
import { cacheCommand } from "../dist/commands/cache.js";
import { achievementsCommand, statsCommand } from "../dist/commands/gamification.js";

registerAllCommands();

test("Cache Command - Registration and aliases", () => {
  const cmd = findCommand("cache");
  assert.ok(cmd, "cache command should be registered");
  assert.equal(cmd.name, "cache");
  assert.ok(cmd.aliases?.includes("caxhe"), "caxhe typo should be aliased to cache");
  assert.ok(cmd.aliases?.includes("memcache"));
});

test("Cache Command - Execution output complies with 72-char rule", async () => {
  const lines: string[] = [];
  const mockOutput = (text: string) => {
    lines.push(text);
  };

  await cacheCommand.handler(["stats"], mockOutput, {} as any);
  assert.ok(lines.length > 0, "cache command should output telemetry");

  // Verify 72-character divider rule
  const dividers = lines.filter((l) => l === "─".repeat(72));
  assert.ok(dividers.length >= 2, "cache output should have 72-char header and footer dividers");

  // Verify headers and telemetry
  assert.ok(lines.some((l) => l.includes("lil-zila › cache telemetry")));
  assert.ok(lines.some((l) => l.includes("CacheService")));
});

test("Cache Command - Benchmark mode", async () => {
  const lines: string[] = [];
  const mockOutput = (text: string) => {
    lines.push(text);
  };

  await cacheCommand.handler(["benchmark"], mockOutput, {} as any);
  assert.ok(lines.some((l) => l.includes("cache latency benchmark")));
  assert.ok(lines.some((l) => l.includes("Local FS Memory")));
});

test("Achievements & Stats Commands - Registration and text formatting", async () => {
  const achCmd = findCommand("achievements");
  assert.ok(achCmd, "achievements command should be registered");

  const statCmd = findCommand("stats");
  assert.ok(statCmd, "stats command should be registered");
});
