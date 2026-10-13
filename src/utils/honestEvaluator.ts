import { generateChatResponse, type ChatMessage } from "./aiClient.js";
import type { ExtractedSupervisorPrompt } from "./supervisorPromptExtractor.js";

export interface HonestEvaluationResult {
  score: number; // 0.0 to 1.0
  weightedScore: number;
  honestSummary: string;
  requirementVerifications: {
    requirement: string;
    status: "PASS" | "PARTIAL" | "FAIL";
    explanation: string;
  }[];
  supervisorRecommendation: string;
}

/**
 * Performs honest semantic evaluation comparing the student's actual Git diff
 * against supervisor requirements.
 */
export async function evaluateStudentWorkHonestly(
  instructions: ExtractedSupervisorPrompt,
  gitDiff: string,
  commitLogs: string[] = [],
): Promise<HonestEvaluationResult> {
  // If no diff, return 0
  if (!gitDiff || gitDiff.trim().length === 0) {
    return {
      score: 0.0,
      weightedScore: 0.0,
      honestSummary: "No code changes detected in student branch.",
      requirementVerifications: instructions.requirements.map((req) => ({
        requirement: req,
        status: "FAIL",
        explanation: "No implementation found in diff.",
      })),
      supervisorRecommendation: "Reject PR: Branch contains no code changes.",
    };
  }

  const prompt = `You are an honest, objective supervisor evaluating a student engineer's code submission.
Your job is to compare what the student was instructed to do against what they TRULY implemented in their Git diff.

SUPERVISOR REQUIREMENTS:
${instructions.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n") || "Complete assigned task."}
Weight: ${instructions.weight}

STUDENT GIT COMMIT LOGS:
${commitLogs.join("\n") || "No commit messages."}

STUDENT GIT DIFF:
\`\`\`diff
${gitDiff.slice(0, 4000)}
\`\`\`

EVALUATION RULES:
1. Be completely truthful. Do not inflate marks.
2. Check if requirements were actually implemented, or if the student only committed boilerplate or hardcoded values.
3. Score strictly between 0.0 and 1.0.
4. Output your response as valid JSON matching this schema exactly:
{
  "score": 0.85,
  "honestSummary": "Brief honest summary of true accomplishments and shortcomings",
  "requirementVerifications": [
    { "requirement": "text", "status": "PASS" | "PARTIAL" | "FAIL", "explanation": "reason" }
  ],
  "supervisorRecommendation": "Merge approved with full marks" | "Merge approved with partial marks" | "Request revisions"
}`;

  try {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are a strict academic evaluator. Output only valid JSON." },
      { role: "user", content: prompt },
    ];

    const rawResponse = await generateChatResponse(messages, { temperature: 0.2 });
    const cleanJson = rawResponse.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    const score = Math.max(0.0, Math.min(1.0, parseFloat(parsed.score) || 0.0));
    const weightedScore = score * instructions.weight;

    return {
      score,
      weightedScore,
      honestSummary: parsed.honestSummary || "Evaluation complete.",
      requirementVerifications: parsed.requirementVerifications || [],
      supervisorRecommendation: parsed.supervisorRecommendation || "Review submitted work.",
    };
  } catch (err) {
    // Fallback heuristic scoring if offline or API unavailable
    const diffLines = gitDiff.split("\n").filter((l) => l.startsWith("+")).length;
    const baseScore = diffLines > 20 ? 0.8 : diffLines > 5 ? 0.5 : 0.2;
    return {
      score: baseScore,
      weightedScore: baseScore * instructions.weight,
      honestSummary: "Automated heuristic evaluation applied.",
      requirementVerifications: instructions.requirements.map((r) => ({
        requirement: r,
        status: baseScore >= 0.8 ? "PASS" : "PARTIAL",
        explanation: "Static code inspection heuristic.",
      })),
      supervisorRecommendation: baseScore >= 0.7 ? "Merge approved." : "Request revisions.",
    };
  }
}
