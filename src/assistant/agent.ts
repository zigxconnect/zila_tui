import { callAgentStep, AIResponseError, type Message } from "./config.js";
import { runTool, buildToolDescriptions } from "./tools.js";

// Event types the UI consumes

export type AgentEvent =
  | { type: "step"; iteration: number; max: number }
  | { type: "thought"; text: string }
  | { type: "action"; tool: string; args: Record<string, string> }
  | { type: "observation"; tool: string; preview: string; full: string }
  | { type: "answer"; text: string }
  | { type: "error"; text: string }
  | { type: "warn"; text: string }
  | { type: "max_steps" };

// Constants

const MAX_ITERATIONS = 5;
const OBSERVATION_LIMIT = 8000;
const OBSERVATION_PREVIEW = 500;

const AGENT_SYSTEM_PROMPT = `
You are a repository analyst agent for ZILA, a developer tool built by the Zigex Open Source Initiative.
You answer questions about a code repository by reasoning step by step and using tools to gather real evidence.

You have access to these tools:
{tool_descriptions}

━━━ OUTPUT FORMAT ━━━

On each turn output EXACTLY one of these — nothing else, no extra prose:

To use a tool:
THOUGHT: <your reasoning about what you need and why>
ACTION: {"tool": "<name>", "args": {"key": "value"}}

To use a tool with no args:
ACTION: {"tool": "<name>", "args": {}}

When you have enough information:
THOUGHT: <your final synthesis>
ANSWER: <your complete, well-structured answer>

━━━ RULES ━━━
- Always begin with THOUGHT.
- Call exactly one tool per turn.
- Base every claim on what you actually observed — never invent.
- When reading large files, use start_line/end_line to stay focused.
- Prefer search_code to find specific functions rather than reading whole files blindly.
- Stop calling tools the moment you have enough evidence. Write ANSWER.
- Structure your ANSWER clearly: use headings, bullet points, and code blocks where they help.
`.trim();

// Parser

function parseResponse(text: string): {
  thought: string | null;
  action: { tool: string; args: Record<string, string> } | null;
  answer: string | null;
} {
  const result = {
    thought: null as string | null,
    action: null as { tool: string; args: Record<string, string> } | null,
    answer: null as string | null,
  };

  const thoughtMatch = text.match(/THOUGHT:\s*(.+?)(?=ACTION:|ANSWER:|$)/s);
  if (thoughtMatch?.[1]) result.thought = thoughtMatch[1].trim();

  const actionMatch = text.match(/ACTION:\s*(\{[\s\S]+)/);
  if (actionMatch?.[1]) {
    let raw = actionMatch[1].trim();
    const lastBrace = raw.lastIndexOf("}");
    if (lastBrace !== -1) raw = raw.slice(0, lastBrace + 1);
    // Balance braces
    const open = (raw.match(/\{/g) ?? []).length;
    const close = (raw.match(/\}/g) ?? []).length;
    if (open > close) raw += "}".repeat(open - close);
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.tool && parsed.tool !== "error") {
        result.action = { tool: parsed.tool, args: parsed.args ?? {} };
      }
    } catch {
      const toolFallback = raw.match(/"tool"\s*:\s*"([^"]+)"/);
      if (toolFallback?.[1]) {
        result.action = { tool: toolFallback[1], args: {} };
      }
    }
  }

  const answerMatch = text.match(/ANSWER:\s*([\s\S]+)/);
  if (answerMatch?.[1]) result.answer = answerMatch[1].trim();

  return result;
}

// ReAct loop

export async function* runAgent(
  question: string,
  repoPath: string,
): AsyncGenerator<AgentEvent> {
  const systemPrompt = AGENT_SYSTEM_PROMPT.replace(
    "{tool_descriptions}",
    buildToolDescriptions(),
  );

  const history: Message[] = [
    { role: "user", content: `Question: ${question}` },
  ];

  let nudgeCount = 0; // track consecutive parse failures to avoid infinite nudging

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    yield { type: "step", iteration: i, max: MAX_ITERATIONS };

    let raw: string;
    try {
      raw = await callAgentStep(history, systemPrompt);
    } catch (e) {
      const msg = e instanceof AIResponseError ? e.message : String(e);
      yield { type: "error", text: msg };
      return;
    }

    history.push({ role: "assistant", content: raw });

    const parsed = parseResponse(raw);
    if (!parsed.thought && !parsed.action && !parsed.answer) {
      yield {
        type: "warn",
        text: `Model did not follow the expected format. Raw response:\n\n${raw.slice(0, 600)}`,
      };
    }

    if (parsed.thought) {
      yield { type: "thought", text: parsed.thought };
    }

    if (parsed.answer) {
      yield { type: "answer", text: parsed.answer };
      return;
    }

    if (parsed.action) {
      nudgeCount = 0;
      const { tool, args } = parsed.action;
      yield { type: "action", tool, args };

      let observation = runTool(tool, repoPath, args);
      if (observation.length > OBSERVATION_LIMIT) {
        observation =
          observation.slice(0, OBSERVATION_LIMIT) +
          `\n\n[... truncated at ${OBSERVATION_LIMIT} chars. Use start_line/end_line or search_code to focus on a specific section.]`;
      }

      const preview =
        observation.slice(0, OBSERVATION_PREVIEW) +
        (observation.length > OBSERVATION_PREVIEW ? "\n…" : "");

      yield { type: "observation", tool, preview, full: observation };
      history.push({ role: "user", content: `OBSERVATION:\n${observation}` });
    } else {
      nudgeCount++;
      if (nudgeCount >= 2) {
        yield {
          type: "error",
          text: "The model failed to produce a valid response after multiple attempts. Try rephrasing your question.",
        };
        return;
      }
      yield {
        type: "warn",
        text: "Model did not return a valid ACTION or ANSWER. Sending a correction nudge…",
      };
      history.push({
        role: "user",
        content:
          "Your response did not contain a valid ACTION or ANSWER.\n" +
          "Do NOT repeat the same response. Choose one:\n" +
          "  • Output ACTION with a tool from the available list\n" +
          "  • Output ANSWER if you already have enough information\n" +
          "Do not add any other text outside those keywords.",
      });
    }
  }

  yield { type: "max_steps" };
}
