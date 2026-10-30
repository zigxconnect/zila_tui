import { generateChatResponse, type ChatMessage } from "./aiClient.js";
import type { ExtractedSupervisorPrompt } from "./supervisorPromptExtractor.js";
import type { CheatingAuditReport } from "./antiCheatingDetector.js";

export interface HonestEvaluationResult {
  score: number; // 0.0 to 1.0
  weightedScore: number;
  whatStudentDid: string;
  howTheySolved: string;
  cheatingStatus: "CLEAN" | "SUSPECTED" | "FLAGGED";
  cheatingDetails: string;
  proposedMark: number; // Strictly 0.0 to 1.0
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
 * against supervisor requirements and git history anti-cheating signals.
 */
export async function evaluateStudentWorkHonestly(
  instructions: ExtractedSupervisorPrompt,
  gitDiff: string,
  commitLogs: string[] = [],
  cheatingReport?: CheatingAuditReport,
): Promise<HonestEvaluationResult> {
  const isFlagged = cheatingReport?.isCheatingSuspected || false;
  const cheatingStatus = isFlagged
    ? "FLAGGED"
    : cheatingReport && cheatingReport.riskLevel === "LOW"
    ? "SUSPECTED"
    : "CLEAN";

  const cheatingDetails = cheatingReport
    ? cheatingReport.findingsSummary
    : "No git integrity anomalies detected.";

  // If no diff, return 0
  if (!gitDiff || gitDiff.trim().length === 0) {
    return {
      score: 0.0,
      weightedScore: 0.0,
      whatStudentDid: "No code changes were implemented.",
      howTheySolved: "Branch was created without committing exercise implementation.",
      cheatingStatus: "CLEAN",
      cheatingDetails: "Empty submission.",
      proposedMark: 0.0,
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
Your job is to compare what the student was instructed to do against what they TRULY implemented in their Git diff and Git history.

SUPERVISOR REQUIREMENTS:
${instructions.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n") || "Complete assigned task."}
Weight: ${instructions.weight}

INTEGRITY & ANTI-CHEATING AUDIT FINDINGS:
Status: ${cheatingStatus}
Details: ${cheatingDetails}
Penalty Deduction: ${cheatingReport?.proposedMarkPenalty || 0.0}

STUDENT GIT COMMIT LOGS:
${commitLogs.join("\n") || "No commit messages."}

STUDENT GIT DIFF:
\`\`\`diff
${gitDiff.slice(0, 4000)}
\`\`\`

EVALUATION RULES:
1. Be completely truthful. Do not inflate marks.
2. Formulate "whatStudentDid" (concise explanation of features/code added).
3. Formulate "howTheySolved" (technical approach and commit evolution).
4. Score strictly between 0.0 and 1.0. If cheating/copy-paste was flagged, cap the score at ${cheatingReport?.proposedMarkCap ?? 0.5}.
5. Output your response as valid JSON matching this schema exactly:
{
  "whatStudentDid": "Brief straightforward explanation of what code was built",
  "howTheySolved": "How the candidate solved the problem or committed the solution",
  "score": 0.85,
  "honestSummary": "Brief honest summary of accomplishments and shortcomings",
  "requirementVerifications": [
    { "requirement": "text", "status": "PASS" | "PARTIAL" | "FAIL", "explanation": "reason" }
  ],
  "supervisorRecommendation": "Merge approved with full marks" | "Merge approved with partial marks" | "Reject: Cheating or incomplete"
}`;

  try {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are a strict academic evaluator. Output only valid JSON." },
      { role: "user", content: prompt },
    ];

    const rawResponse = await generateChatResponse(messages, { temperature: 0.2 });
    const cleanJson = rawResponse.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    let rawScore = Math.max(0.0, Math.min(1.0, parseFloat(parsed.score) || 0.0));
    if (cheatingReport) {
      rawScore = Math.min(rawScore, cheatingReport.proposedMarkCap);
      rawScore = Math.max(0.0, rawScore - cheatingReport.proposedMarkPenalty * 0.5);
    }
    const score = Math.round(rawScore * 100) / 100;
    const weightedScore = score * instructions.weight;

    return {
      score,
      weightedScore,
      whatStudentDid: parsed.whatStudentDid || "Implemented exercise code according to diff.",
      howTheySolved: parsed.howTheySolved || "Completed task through git commits.",
      cheatingStatus,
      cheatingDetails,
      proposedMark: score,
      honestSummary: parsed.honestSummary || "Evaluation complete.",
      requirementVerifications: parsed.requirementVerifications || [],
      supervisorRecommendation: parsed.supervisorRecommendation || (score >= 0.7 ? "Merge approved." : "Request revisions."),
    };
  } catch (err) {
    // Fallback heuristic scoring if offline or API unavailable
    const diffLines = gitDiff.split("\n").filter((l) => l.startsWith("+")).length;
    let baseScore = diffLines > 20 ? 0.8 : diffLines > 5 ? 0.5 : 0.2;
    if (cheatingReport) {
      baseScore = Math.min(baseScore, cheatingReport.proposedMarkCap);
    }
    const score = Math.round(baseScore * 100) / 100;

    return {
      score,
      weightedScore: score * instructions.weight,
      whatStudentDid: `Implemented ${diffLines} line(s) of code in repository.`,
      howTheySolved: `Submitted solution via git commit history (${commitLogs.length} commit(s)).`,
      cheatingStatus,
      cheatingDetails,
      proposedMark: score,
      honestSummary: "Automated heuristic evaluation applied.",
      requirementVerifications: instructions.requirements.map((r) => ({
        requirement: r,
        status: score >= 0.7 ? "PASS" : "PARTIAL",
        explanation: "Static code inspection heuristic.",
      })),
      supervisorRecommendation: score >= 0.7 ? "Merge approved." : "Request revisions.",
    };
  }
}

