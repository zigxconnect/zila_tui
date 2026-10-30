import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateAndConfigureAgent } from "../dist/screens/AgentSetupScreen.js";
import { clearAgentConfig, loadAgentConfig } from "../dist/utils/aiConfig.js";

test("valid API key setup saves the default model and opens Lil Agent", async () => {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "zila-agent-setup-"));
  const previousConfigDir = process.env.ZILA_CONFIG_DIR;
  const previousFetch = globalThis.fetch;
  process.env.ZILA_CONFIG_DIR = configDir;
  globalThis.fetch = async () => new Response("{}", { status: 200 });

  let openedLilAgent = false;

  try {
    const error = await validateAndConfigureAgent("gemini", "test-gemini-key", () => {
      openedLilAgent = true;
    });
    assert.equal(error, null);
    assert.equal(openedLilAgent, true);
    assert.equal(loadAgentConfig()?.provider, "gemini");
    assert.equal(loadAgentConfig()?.apiKey, "test-gemini-key");
    assert.equal(loadAgentConfig()?.model, "gemini-2.5-flash");
  } finally {
    clearAgentConfig();
    globalThis.fetch = previousFetch;
    if (previousConfigDir === undefined) delete process.env.ZILA_CONFIG_DIR;
    else process.env.ZILA_CONFIG_DIR = previousConfigDir;
    fs.rmSync(configDir, { recursive: true, force: true });
  }
});