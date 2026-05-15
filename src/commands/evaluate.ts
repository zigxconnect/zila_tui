import type { ZilaCommand } from "./registry.js";
import { zilaApi, AuthRequiredError, AuthExpiredError } from "../utils/auth.js";

interface EvaluationResult {
  internship_id?: string;
  title?: string;
  fit_score?: number;            
  strengths?: string[];
  gaps?: string[];
  recommendation?: string;
  next_steps?: string[];
}

function scoreBar(score: number): string {
  const pct = Math.round(score * 100);
  const filled = Math.round(score * 20);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);
  return `${bar}  ${pct}%`;
}

export const evaluateCommand: ZilaCommand = {
  name: "evaluate",
  aliases: ["eval"],
  description: "Get your fit score for an internship",
  usage: "evaluate <internship-id>",
  category: "agent",
  available: true,
  handler: async (args, output) => {
    const id = args[0]?.trim();
    if (!id) {
      output("Usage:  evaluate <internship-id>", "warning");
      output("Run  search <query>  first to find an internship ID.", "dim");
      return;
    }

    output(`Running fit analysis for internship ${id}…`, "dim");
    output("This may take a moment — the agent is checking your profile.", "dim");

    try {
      const result = await zilaApi<EvaluationResult>("/internships/evaluate", {
        method: "POST",
        body: { internship_id: id },
      });

      output("", "default");
      output("━━━  FIT EVALUATION  ━━━", "default");
      if (result.title) output(`  ${result.title}`, "default");
      output("", "default");

      if (result.fit_score != null) {
        output(`  Fit Score   ${scoreBar(result.fit_score)}`, "default");
        output("", "default");
      }

      if (result.strengths?.length) {
        output("  Strengths", "success");
        for (const s of result.strengths) output(`    + ${s}`, "dim");
        output("", "default");
      }

      if (result.gaps?.length) {
        output("  Gaps to address", "warning");
        for (const g of result.gaps) output(`    − ${g}`, "dim");
        output("", "default");
      }

      if (result.recommendation) {
        output("  Recommendation", "default");
        output(`  ${result.recommendation}`, "dim");
        output("", "default");
      }

      if (result.next_steps?.length) {
        output("  Next steps", "default");
        for (const s of result.next_steps) output(`    → ${s}`, "dim");
        output("", "default");
      }
    } catch (e) {
      if (e instanceof AuthRequiredError || e instanceof AuthExpiredError) {
        output(e.message, "error");
        output("Run  zila auth  to sign in.", "dim");
      } else if (e instanceof Error && (e.message.includes("404") || e.message.includes("not found"))) {
        output(`Internship "${id}" not found.`, "error");
        output("Run  search <query>  to find valid IDs.", "dim");
      } else {
        output(`Evaluation failed: ${e instanceof Error ? e.message : String(e)}`, "error");
      }
    }
  },
};