import fs from "node:fs";
import path from "node:path";

export class AIResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIResponseError";
  }
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// Model fallback chain — tried in order, first success wins
const DEFAULT_MODELS = [
  "google/gemini-2.5-flash-lite",
  "meta-llama/llama-4-scout:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

const TIMEOUT_MS = 30_000;

function loadEnv(assistantPath: string): void {
  // Load .env from the assistant directory if present
  const envPath = path.join(assistantPath, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = val;
  }
}

export function initClient(assistantPath: string): void {
  loadEnv(assistantPath);
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not found in environment or .env file");
}

async function callModel(
  messages: Message[],
  models = DEFAULT_MODELS,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
  if (!apiKey) throw new AIResponseError("OPENROUTER_API_KEY not set");

  const errors: Record<string, string> = {};

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://github.com/zigex/zila",
          "X-Title": "ZILA Assistant",
        },
        body: JSON.stringify({ model, messages, temperature: 0.3 }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const body = await res.text();
        errors[model] = `HTTP ${res.status}: ${body.slice(0, 200)}`;
        continue;
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        error?: { message: string };
      };

      if (data.error) {
        errors[model] = data.error.message;
        continue;
      }

      const content = data?.choices?.[0]?.message?.content?.trim();
      if (content) return content;

      errors[model] = "Empty response from model";
    } catch (e: unknown) {
      errors[model] = e instanceof Error ? e.message : String(e);
    }
  }

  throw new AIResponseError(
    "All models failed:\n" +
      Object.entries(errors).map(([m, e]) => `  • ${m}: ${e}`).join("\n"),
  );
}

export async function callAgentStep(
  messages: Message[],
  systemPrompt: string,
): Promise<string> {
  return callModel([{ role: "system", content: systemPrompt }, ...messages]);
}