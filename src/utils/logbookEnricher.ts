import fs from "fs";
import path from "path";
import type { HonestEvaluationResult } from "./honestEvaluator.js";

export interface LogbookEntryPayload {
  username: string;
  taskTitle: string;
  prUrl?: string;
  evaluation: HonestEvaluationResult;
  repoRoot?: string;
}

/**
 * Enriches the student's personal logbook file under:
 * contributors/<username>/logbook.md
 */
export function enrichContributorLogbook(payload: LogbookEntryPayload): {
  filePath: string;
  appended: boolean;
} {
  const repoRoot = payload.repoRoot || process.cwd();
  const contributorDir = path.join(repoRoot, "contributors", payload.username);
  const logbookPath = path.join(contributorDir, "logbook.md");

  if (!fs.existsSync(contributorDir)) {
    fs.mkdirSync(contributorDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const passCount = payload.evaluation.requirementVerifications.filter((r) => r.status === "PASS").length;
  const totalCount = payload.evaluation.requirementVerifications.length;

  const entryMarkdown = `
---

### 📝 Submission: ${payload.taskTitle}
- **Date & Time:** ${timestamp}
${payload.prUrl ? `- **Pull Request:** [${payload.prUrl}](${payload.prUrl})\n` : ""}- **Evaluated Score:** ${(payload.evaluation.score * 100).toFixed(0)}% (${payload.evaluation.score.toFixed(2)} / 1.0)
- **Requirements Satisfied:** ${passCount} / ${totalCount} PASS
- **Verified Work Summary:**
  ${payload.evaluation.honestSummary}
- **Supervisor Recommendation:** ${payload.evaluation.supervisorRecommendation}

#### Verified Criteria Breakdown:
${payload.evaluation.requirementVerifications
  .map((v) => `- [${v.status === "PASS" ? "x" : " "}] **${v.requirement}**: ${v.explanation}`)
  .join("\n")}
`;

  let existingContent = "";
  if (fs.existsSync(logbookPath)) {
    existingContent = fs.readFileSync(logbookPath, "utf8");
  } else {
    existingContent = `# Engineering Internship Contributor Logbook\n\n**Contributor:** \`${payload.username}\`\n\nAutomated logbook entries verified by Zila Autonomous Agent.\n`;
  }

  const updatedContent = existingContent.trimEnd() + "\n" + entryMarkdown;
  fs.writeFileSync(logbookPath, updatedContent, "utf8");

  return {
    filePath: logbookPath,
    appended: true,
  };
}
