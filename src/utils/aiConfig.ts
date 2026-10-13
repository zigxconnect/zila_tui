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

export interface ProviderMetadata {
  id: AIProvider;
  name: string;
  defaultModel: string;
  recommended?: boolean;
  description: string;
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
    defaultModel: "llama-3.3-70b-versatile",
    description: "Ultra-low latency inference for open weights",
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
