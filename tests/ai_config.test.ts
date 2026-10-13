import test from "node:test";
import assert from "node:assert/strict";
import { SUPPORTED_PROVIDERS, saveAgentConfig, loadAgentConfig, clearAgentConfig } from "../dist/utils/aiConfig.js";

test("SUPPORTED_PROVIDERS contains gemini, groq, claude, openai and openrouter", () => {
  const ids = SUPPORTED_PROVIDERS.map((p) => p.id);
  assert.ok(ids.includes("gemini"));
  assert.ok(ids.includes("groq"));
  assert.ok(ids.includes("claude"));
  assert.ok(ids.includes("openai"));
  assert.ok(ids.includes("openrouter"));

  const gemini = SUPPORTED_PROVIDERS.find((p) => p.id === "gemini");
  assert.equal(gemini?.recommended, true);
  assert.equal(gemini?.defaultModel, "gemini-1.5-flash");
});

test("saveAgentConfig and loadAgentConfig properly store and load configuration", () => {
  const testConfig = {
    provider: "groq" as const,
    apiKey: "gsk_test_1234567890",
    model: "llama-3.3-70b-versatile",
    configuredAt: new Date().toISOString(),
  };

  saveAgentConfig(testConfig);
  const loaded = loadAgentConfig();

  assert.ok(loaded);
  assert.equal(loaded?.provider, "groq");
  assert.equal(loaded?.apiKey, "gsk_test_1234567890");

  clearAgentConfig();
});
