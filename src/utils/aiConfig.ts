import fs from "fs";
import path from "path";
import os from "os";

export type AIProvider = "gemini" | "groq" | "claude" | "openai" | "openrouter";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  configuredAt: string;
}

export interface ModelMetadata {
  id: string;
  name: string;
  description?: string;
  recommended?: boolean;
}

export interface ProviderMetadata {
  id: AIProvider;
  name: string;
  defaultModel: string;
  recommended?: boolean;
  description: string;
}

export interface ModelFamily {
  id: string;
  name: string;
  models: ModelMetadata[];
}

export const GROQ_MODEL_FAMILIES: ModelFamily[] = [
  {
    id: "meta",
    name: "Meta",
    models: [
      { id: "llama-3.1-8b-instant", name: "llama-3.1-8b-instant", description: "Ultra-fast 8B model (Free Tier standard)", recommended: true },
      { id: "llama-3.3-70b-versatile", name: "llama-3.3-70b-versatile", description: "High-capacity 70B reasoning model" },
      { id: "llama-3.1-70b-versatile", name: "llama-3.1-70b-versatile", description: "Versatile 70B instruction model" },
      { id: "meta-llama/llama-prompt-guard-2-22m", name: "meta-llama/llama-prompt-guard-2-22m", description: "Security & prompt safety 22M" },
      { id: "meta-llama/llama-prompt-guard-2-86m", name: "meta-llama/llama-prompt-guard-2-86m", description: "Security & prompt safety 86M" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "openai/gpt-oss-120b", name: "openai/gpt-oss-120b", description: "OpenAI open weights 120B on Groq LPU", recommended: true },
      { id: "openai/gpt-oss-20b", name: "openai/gpt-oss-20b", description: "OpenAI open weights 20B on Groq LPU" },
      { id: "openai/gpt-oss-safeguard-20b", name: "openai/gpt-oss-safeguard-20b", description: "OpenAI safety guardrail model" },
      { id: "whisper-large-v3", name: "whisper-large-v3", description: "Multilingual transcription" },
      { id: "whisper-large-v3-turbo", name: "whisper-large-v3-turbo", description: "Fast transcription engine" },
    ],
  },
  {
    id: "alibaba",
    name: "Alibaba Cloud",
    models: [
      { id: "qwen/qwen3.8-27b", name: "qwen/qwen3.8-27b", description: "Qwen 3.8 27B high-throughput reasoning", recommended: true },
      { id: "qwen-2.5-coder-32b", name: "qwen-2.5-coder-32b", description: "Specialized coding and software engineering 32B" },
      { id: "qwen-2.5-32b", name: "qwen-2.5-32b", description: "Multilingual general reasoning 32B" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek-r1-distill-llama-70b", name: "deepseek-r1-distill-llama-70b", description: "DeepSeek R1 reasoning distilled into Llama 70B", recommended: true },
    ],
  },
  {
    id: "mistral",
    name: "Mistral",
    models: [
      { id: "mixtral-8x7b-32768", name: "mixtral-8x7b-32768", description: "Mixture-of-Experts with 32k context" },
    ],
  },
  {
    id: "google",
    name: "Google",
    models: [
      { id: "gemma2-9b-it", name: "gemma2-9b-it", description: "Google Gemma 2 9B instruction model" },
    ],
  },
  {
    id: "canopylabs",
    name: "Canopy Labs",
    models: [
      { id: "canopylabs/orpheus-v1-english", name: "canopylabs/orpheus-v1-english", description: "Canopy Labs English domain model" },
      { id: "canopylabs/orpheus-arabic-saudi", name: "canopylabs/orpheus-arabic-saudi", description: "Canopy Labs Arabic language model" },
    ],
  },
];

export const GEMINI_MODEL_FAMILIES: ModelFamily[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    models: [
      { id: "gemini-2.5-flash", name: "gemini-2.5-flash", description: "Ultra-fast next-gen flash reasoning (Recommended)", recommended: true },
      { id: "gemini-2.5-pro", name: "gemini-2.5-pro", description: "Deep architectural reasoning and heavy coding" },
      { id: "gemini-1.5-pro", name: "gemini-1.5-pro", description: "1M token long-context flagship model" },
      { id: "gemini-1.5-flash", name: "gemini-1.5-flash", description: "High-frequency lightweight model" },
    ],
  },
];

export const CLAUDE_MODEL_FAMILIES: ModelFamily[] = [
  {
    id: "claude",
    name: "Anthropic Claude",
    models: [
      { id: "claude-3-5-sonnet-latest", name: "claude-3-5-sonnet-latest", description: "Top-tier coding precision and architecture (Recommended)", recommended: true },
      { id: "claude-3-5-haiku-latest", name: "claude-3-5-haiku-latest", description: "Lightning-fast coding and unit test generation" },
      { id: "claude-3-opus-latest", name: "claude-3-opus-latest", description: "Maximum depth reasoning on complex legacy code" },
    ],
  },
];

export const OPENAI_MODEL_FAMILIES: ModelFamily[] = [
  {
    id: "gpt4",
    name: "OpenAI GPT-4o",
    models: [
      { id: "gpt-4o", name: "gpt-4o", description: "Flagship multimodal intelligence (Recommended)", recommended: true },
      { id: "gpt-4o-mini", name: "gpt-4o-mini", description: "Fast, cost-efficient everyday coding" },
      { id: "o1", name: "o1", description: "Full chain-of-thought advanced reasoning" },
      { id: "o1-mini", name: "o1-mini", description: "Fast reasoning for competitive coding & STEM" },
    ],
  },
];

export const OPENROUTER_MODEL_FAMILIES: ModelFamily[] = [
  {
    id: "openrouter",
    name: "OpenRouter Gateway",
    models: [
      { id: "auto", name: "auto", description: "Automatically routes to best available model", recommended: true },
      { id: "anthropic/claude-3.5-sonnet", name: "anthropic/claude-3.5-sonnet", description: "Claude 3.5 Sonnet via OpenRouter" },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "meta-llama/llama-3.3-70b-instruct", description: "Meta Llama 3.3 70B Instruct" },
      { id: "deepseek/deepseek-r1", name: "deepseek/deepseek-r1", description: "DeepSeek R1 full reasoning" },
    ],
  },
];

export function getProviderModelFamilies(provider: AIProvider): ModelFamily[] {
  switch (provider) {
    case "groq":
      return GROQ_MODEL_FAMILIES;
    case "gemini":
      return GEMINI_MODEL_FAMILIES;
    case "claude":
      return CLAUDE_MODEL_FAMILIES;
    case "openai":
      return OPENAI_MODEL_FAMILIES;
    case "openrouter":
      return OPENROUTER_MODEL_FAMILIES;
    default:
      return [];
  }
}

export async function fetchProviderModels(provider: AIProvider, apiKey: string): Promise<ModelFamily[]> {
  const fallback = getProviderModelFamilies(provider);
  if (provider !== "groq") {
    return fallback;
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    });
    if (!res.ok) return fallback;

    const data: any = await res.json();
    const liveModels: Array<{ id: string; owned_by?: string }> = data?.data || [];
    if (!liveModels.length) return fallback;

    const liveIdSet = new Set(liveModels.map((m) => m.id));

    // Filter fallback families to live models when available
    const matchedFamilies: ModelFamily[] = GROQ_MODEL_FAMILIES.map((family) => {
      const active = family.models.filter((m) => liveIdSet.has(m.id));
      return {
        ...family,
        models: active.length ? active : family.models,
      };
    }).filter((f) => f.models.length > 0);

    // Any extra live models not in curated list
    const curatedIds = new Set(GROQ_MODEL_FAMILIES.flatMap((f) => f.models.map((m) => m.id)));
    const uncategorized = liveModels
      .filter((m) => !curatedIds.has(m.id))
      .map((m) => ({ id: m.id, name: m.id, description: `Owned by ${m.owned_by || "groq"}` }));

    if (uncategorized.length > 0) {
      matchedFamilies.push({
        id: "other",
        name: "Other Available Models",
        models: uncategorized,
      });
    }

    return matchedFamilies.length ? matchedFamilies : fallback;
  } catch {
    return fallback;
  }
}

export const SUPPORTED_PROVIDERS: ProviderMetadata[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    recommended: true,
    description: "Gemini 2.5 Flash — Ultra-fast, high-precision reasoning (Recommended)",
  },
  {
    id: "groq",
    name: "Groq LPU",
    defaultModel: "llama-3.1-8b-instant",
    description: "Ultra-low latency inference for open weights (Meta, OpenAI, Qwen)",
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    defaultModel: "claude-3-5-sonnet-latest",
    description: "Top-tier coding precision & architectural reasoning",
  },
  {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4o",
    description: "Industry standard multimodal reasoning",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    defaultModel: "auto",
    description: "Unified universal gateway for 100+ models",
  },
];

import { getZilaDir } from "./activeCohort.js";

export function getAgentConfigPath(): string {
  return path.join(getZilaDir(), "agent_config.json");
}

export function loadAgentConfig(): AIProviderConfig | null {
  try {
    const configPath = getAgentConfigPath();
    if (!fs.existsSync(configPath)) {
      // Check environment variables as fallbacks
      if (process.env.GEMINI_API_KEY) {
        return {
          provider: "gemini",
          apiKey: process.env.GEMINI_API_KEY,
          model: "gemini-2.5-flash",
          configuredAt: new Date().toISOString(),
        };
      }
      if (process.env.GROQ_API_KEY) {
        return {
          provider: "groq",
          apiKey: process.env.GROQ_API_KEY,
          model: "llama-3.3-70b-versatile",
          configuredAt: new Date().toISOString(),
        };
      }
      if (process.env.ANTHROPIC_API_KEY) {
        return {
          provider: "claude",
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: "claude-3-5-sonnet-latest",
          configuredAt: new Date().toISOString(),
        };
      }
      if (process.env.OPENAI_API_KEY) {
        return {
          provider: "openai",
          apiKey: process.env.OPENAI_API_KEY,
          model: "gpt-4o",
          configuredAt: new Date().toISOString(),
        };
      }
      if (process.env.OPENROUTER_API_KEY) {
        return {
          provider: "openrouter",
          apiKey: process.env.OPENROUTER_API_KEY,
          model: "auto",
          configuredAt: new Date().toISOString(),
        };
      }
      return null;
    }

    const raw = fs.readFileSync(configPath, "utf8");
    const data = JSON.parse(raw);
    if (data?.provider && data?.apiKey) {
      if (data.provider === "gemini" && (data.model === "gemini-1.5-flash" || !data.model)) {
        data.model = "gemini-2.5-flash";
        try {
          fs.writeFileSync(configPath, JSON.stringify(data, null, 2), "utf8");
        } catch {
          // Ignore write errors on read
        }
      }
      return data as AIProviderConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveAgentConfig(config: AIProviderConfig): void {
  const dir = getZilaDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getAgentConfigPath(), JSON.stringify(config, null, 2), "utf8");
}

export function clearAgentConfig(): void {
  const filePath = getAgentConfigPath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
