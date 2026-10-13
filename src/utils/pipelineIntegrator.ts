import { execSync } from "child_process";
import { extractSupervisorInstructions } from "./supervisorPromptExtractor.js";
import { evaluateStudentWorkHonestly, type HonestEvaluationResult } from "./honestEvaluator.js";
import { enrichContributorLogbook } from "./logbookEnricher.js";

export interface IntegratedSubmissionResult {
  evaluation: HonestEvaluationResult;
  logbookAppended: boolean;
  logbookPath: string;
}

/**
 * Executes local truthful evaluation and enriches contributor logbook
 * during the submission pipeline.
 */
export async function processLocalTaskEvaluation(
  username: string,
  taskTitle: string,
  exerciseCode: string,
  cwd: string = process.cwd(),
): Promise<IntegratedSubmissionResult> {
  // 1. Parse instructions from top comment
  const instructions = extractSupervisorInstructions(exerciseCode);

  // 2. Fetch staged or branch git diff
  let gitDiff = "";
  let commitLogs: string[] = [];

  try {
    gitDiff = execSync("git diff HEAD~1 HEAD", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    if (!gitDiff) {
      gitDiff = execSync("git diff --staged", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    }
    const rawCommits = execSync("git log -n 3 --oneline", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    commitLogs = rawCommits.trim().split("\n");
  } catch {
    // fallback if no commits or diff
    gitDiff = exerciseCode;
  }

  // 3. Evaluate work honestly
  const evaluation = await evaluateStudentWorkHonestly(instructions, gitDiff, commitLogs);

  // 4. Enrich contributor logbook
  const logbookRes = enrichContributorLogbook({
    username,
    taskTitle,
    evaluation,
    repoRoot: cwd,
  });

  return {
    evaluation,
    logbookAppended: logbookRes.appended,
    logbookPath: logbookRes.filePath,
  };
}
