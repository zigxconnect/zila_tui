import test from "node:test";
import assert from "node:assert/strict";
import {
  GROQ_MODEL_FAMILIES,
  GEMINI_MODEL_FAMILIES,
  getProviderModelFamilies,
  fetchProviderModels,
  SUPPORTED_PROVIDERS,
  saveAgentConfig,
  loadAgentConfig,
  clearAgentConfig,
} from "../dist/utils/aiConfig.js";

test("GROQ_MODEL_FAMILIES contains Meta, OpenAI, Alibaba, DeepSeek, Mistral, Google, and Canopy", () => {
  const familyIds = GROQ_MODEL_FAMILIES.map((f) => f.id);
  assert.ok(familyIds.includes("meta"), "Includes Meta family");
  assert.ok(familyIds.includes("openai"), "Includes OpenAI family");
  assert.ok(familyIds.includes("alibaba"), "Includes Alibaba Cloud family");
  assert.ok(familyIds.includes("deepseek"), "Includes DeepSeek family");
  assert.ok(familyIds.includes("mistral"), "Includes Mistral family");
  assert.ok(familyIds.includes("google"), "Includes Google family");
  assert.ok(familyIds.includes("canopylabs"), "Includes Canopy Labs family");

  const metaFam = GROQ_MODEL_FAMILIES.find((f) => f.id === "meta");
  const metaModelIds = metaFam?.models.map((m) => m.id) || [];
  assert.ok(metaModelIds.includes("llama-3.1-8b-instant"), "Includes llama-3.1-8b-instant");
  assert.ok(metaModelIds.includes("llama-3.3-70b-versatile"), "Includes llama-3.3-70b-versatile");

  const openaiFam = GROQ_MODEL_FAMILIES.find((f) => f.id === "openai");
  const openaiModelIds = openaiFam?.models.map((m) => m.id) || [];
  assert.ok(openaiModelIds.includes("openai/gpt-oss-120b"), "Includes openai/gpt-oss-120b");

  const alibabaFam = GROQ_MODEL_FAMILIES.find((f) => f.id === "alibaba");
  const alibabaModelIds = alibabaFam?.models.map((m) => m.id) || [];
  assert.ok(alibabaModelIds.includes("qwen/qwen3.8-27b"), "Includes qwen/qwen3.8-27b");
});

test("Groq provider metadata defaults to llama-3.1-8b-instant for universal free tier compatibility", () => {
  const groq = SUPPORTED_PROVIDERS.find((p) => p.id === "groq");
  assert.ok(groq);
  assert.equal(groq.defaultModel, "llama-3.1-8b-instant");
});

test("getProviderModelFamilies returns correct families for all providers", () => {
  assert.ok(getProviderModelFamilies("groq").length >= 5);
  assert.ok(getProviderModelFamilies("gemini").length >= 1);
  assert.ok(getProviderModelFamilies("claude").length >= 1);
  assert.ok(getProviderModelFamilies("openai").length >= 1);
  assert.ok(getProviderModelFamilies("openrouter").length >= 1);
});

test("Gemini model choices include the requested Flash models", () => {
  const modelIds = GEMINI_MODEL_FAMILIES.flatMap((family) => family.models.map((model) => model.id));
  assert.ok(modelIds.includes("gemini-2.5-flash"));
  assert.ok(modelIds.includes("gemini-3.8-flash"));
});

test("fetchProviderModels falls back gracefully when network fails", async () => {
  const families = await fetchProviderModels("groq", "gsk_invalid_test_key");
  assert.ok(families.length >= 5);
  const meta = families.find((f) => f.id === "meta");
  assert.ok(meta);
  assert.ok(meta.models.some((m) => m.id === "llama-3.1-8b-instant"));
});

test("Active model can be switched and persisted across agent config", () => {
  const config = {
    provider: "groq" as const,
    apiKey: "gsk_live_test_key",
    model: "openai/gpt-oss-120b",
    configuredAt: new Date().toISOString(),
  };

  saveAgentConfig(config);
  const loaded = loadAgentConfig();
  assert.equal(loaded?.model, "openai/gpt-oss-120b");

  // Switch to Qwen
  saveAgentConfig({ ...config, model: "qwen/qwen3.8-27b" });
  const reloaded = loadAgentConfig();
  assert.equal(reloaded?.model, "qwen/qwen3.8-27b");

  clearAgentConfig();
});
