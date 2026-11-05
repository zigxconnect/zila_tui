import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadAuth } from "./auth.js";
import { loadGitHubAuth } from "./githubAuth.js";

export interface CommitAuditRecord {
  hash: string;
  authorName: string;
  authorEmail: string;
  timestamp: number; // Unix epoch seconds
  dateIso: string;
  subject: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export type CheatingRiskLevel = "CLEAN" | "LOW" | "MEDIUM" | "HIGH" | "FLAGGED";

export interface CheatingAuditReport {
  isCheatingSuspected: boolean;
  riskLevel: CheatingRiskLevel;
  confidenceScore: number; // 0.0 (clean) to 1.0 (confirmed malpractice)
  signals: {
    monolithicCommit: boolean;
    rapidVelocity: boolean;
    authorMismatch: boolean;
    aiWatermarksDetected: boolean;
    insufficientProgression: boolean;
  };
  details: string[];
  findingsSummary: string;
  gitMetrics: {
    totalCommits: number;
    totalLinesAdded: number;
    totalLinesDeleted: number;
    durationMinutes: number;
    authorList: string[];
  };
  proposedMarkPenalty: number; // Deductions from max 1.0 (e.g. 0.0 to 1.0)
  proposedMarkCap: number;     // Maximum score allowed if flagged (e.g. 0.3 or 1.0)
}

/**
 * Common AI generator preamble and postamble markers commonly left behind in copied code
 */
const AI_WATERMARK_PATTERNS = [
  /here(?:'s| is) (?:the|a) (?:complete|full|updated) (?:code|implementation|solution)/i,
  /in this (?:code|implementation), we (?:have|defined|created)/i,
  /let me know if you need (?:any|further) (?:assistance|help|clarifications?)/i,
  /\bchatgpt\b/i,
  /\bclaude ai\b/i,
  /\bassistant:\b/i,
  /certainly! here/i,
  /hope this helps!/i,
  /as an ai language model/i,
];

/**
 * Queries Git log for commits affecting the target directory or repository.
 */
export function extractFolderCommitHistory(
  targetFolder: string,
  cwd: string = process.cwd(),
): CommitAuditRecord[] {
  try {
    const relPath = path.relative(cwd, targetFolder) || ".";
    const logCmd = `git log --follow --format="COMMIT|%H|%an|%ae|%at|%ad|%s" --shortstat -- "${relPath}"`;
    const rawOutput = execSync(logCmd, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    if (!rawOutput || !rawOutput.trim()) {
      // Fallback: entire repo branch commits if path specific has no distinct commits
      const repoLogCmd = `git log -n 20 --format="COMMIT|%H|%an|%ae|%at|%ad|%s" --shortstat`;
      const fallbackOutput = execSync(repoLogCmd, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return parseGitLogOutput(fallbackOutput);
    }

    return parseGitLogOutput(rawOutput);
  } catch {
    return [];
  }
}

/**
 * Parse raw git log formatted with shortstat into structured records
 */
export function parseGitLogOutput(rawLog: string): CommitAuditRecord[] {
  const records: CommitAuditRecord[] = [];
  const lines = rawLog.split("\n");

  let currentRecord: Partial<CommitAuditRecord> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("COMMIT|")) {
      if (currentRecord && currentRecord.hash) {
        records.push({
          hash: currentRecord.hash,
          authorName: currentRecord.authorName || "Unknown",
          authorEmail: currentRecord.authorEmail || "",
          timestamp: currentRecord.timestamp || 0,
          dateIso: currentRecord.dateIso || new Date().toISOString(),
          subject: currentRecord.subject || "",
          filesChanged: currentRecord.filesChanged || 0,
          insertions: currentRecord.insertions || 0,
          deletions: currentRecord.deletions || 0,
        });
      }

      const parts = trimmed.split("|");
      currentRecord = {
        hash: parts[1] || "",
        authorName: parts[2] || "",
        authorEmail: parts[3] || "",
        timestamp: parseInt(parts[4] || "0", 10),
        dateIso: parts[5] || "",
        subject: parts.slice(6).join("|") || "",
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
      };
    } else if (currentRecord && (trimmed.includes("file changed") || trimmed.includes("files changed"))) {
      // Parse: "3 files changed, 250 insertions(+), 12 deletions(-)"
      const filesMatch = trimmed.match(/(\d+)\s+files?\s+changed/);
      const insMatch = trimmed.match(/(\d+)\s+insertions?\(\+\)/);
      const delMatch = trimmed.match(/(\d+)\s+deletions?\(-\)/);

      if (filesMatch && filesMatch[1]) currentRecord.filesChanged = parseInt(filesMatch[1], 10);
      if (insMatch && insMatch[1]) currentRecord.insertions = parseInt(insMatch[1], 10);
      if (delMatch && delMatch[1]) currentRecord.deletions = parseInt(delMatch[1], 10);
    }
  }

  if (currentRecord && currentRecord.hash) {
    records.push({
      hash: currentRecord.hash,
      authorName: currentRecord.authorName || "Unknown",
      authorEmail: currentRecord.authorEmail || "",
      timestamp: currentRecord.timestamp || 0,
      dateIso: currentRecord.dateIso || new Date().toISOString(),
      subject: currentRecord.subject || "",
      filesChanged: currentRecord.filesChanged || 0,
      insertions: currentRecord.insertions || 0,
      deletions: currentRecord.deletions || 0,
    });
  }

  return records;
}

/**
 * Inspects source files in target folder for AI watermarks and copy-paste residue
 */
export function scanFilesForAiWatermarks(folderPath: string): { found: boolean; matches: string[] } {
  const matches: string[] = [];
  if (!fs.existsSync(folderPath)) return { found: false, matches: [] };

  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if ([".py", ".ts", ".js", ".c", ".cpp", ".rs", ".go", ".html", ".md", ".json"].includes(ext)) {
          if (entry.name === "exercise.md") continue; // Skip generated exercise report
          const fullPath = path.join(folderPath, entry.name);
          const content = fs.readFileSync(fullPath, "utf8");
          for (const pattern of AI_WATERMARK_PATTERNS) {
            const m = content.match(pattern);
            if (m) {
              matches.push(`${entry.name}: matched "${m[0]}"`);
            }
          }
        }
      }
    }
  } catch {
    // Non-fatal if folder unreadable
  }

  return {
    found: matches.length > 0,
    matches,
  };
}

/**
 * Analyzes Git history and file changes to detect plagiarism and cheating.
 */
export function analyzeGitHistoryForCheating(
  folderPath: string,
  options: {
    cwd?: string;
    studentUsername?: string;
    studentEmail?: string;
    commitsOverride?: CommitAuditRecord[];
    filesContentOverride?: string;
  } = {},
): CheatingAuditReport {
  const cwd = options.cwd || process.cwd();
  const commits = options.commitsOverride || extractFolderCommitHistory(folderPath, cwd);

  const auth = loadAuth();
  const ghAuth = loadGitHubAuth();
  const expectedUsername = options.studentUsername || ghAuth?.username || (auth?.email ? auth.email.split("@")[0] : "");
  const expectedEmail = options.studentEmail || auth?.email || "";

  let totalLinesAdded = 0;
  let totalLinesDeleted = 0;
  const authorsSet = new Set<string>();

  for (const c of commits) {
    totalLinesAdded += c.insertions;
    totalLinesDeleted += c.deletions;
    if (c.authorName) authorsSet.add(c.authorName.toLowerCase());
    if (c.authorEmail) authorsSet.add(c.authorEmail.toLowerCase());
  }

  const authorsList = Array.from(authorsSet);

  // Time duration in minutes across commits
  let durationMinutes = 0;
  if (commits.length >= 2) {
    const sorted = [...commits].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0]!.timestamp;
    const last = sorted[sorted.length - 1]!.timestamp;
    durationMinutes = Math.max(1, Math.round((last - first) / 60));
  }

  const signals = {
    monolithicCommit: false,
    rapidVelocity: false,
    authorMismatch: false,
    aiWatermarksDetected: false,
    insufficientProgression: false,
  };

  const details: string[] = [];

  // 1. Monolithic single commit detection:
  // If only 1 commit introduced a massive amount of code (>120 lines) in a completed exercise
  if (commits.length === 1 && totalLinesAdded >= 120) {
    signals.monolithicCommit = true;
    details.push(
      `Monolithic code dump: All ${totalLinesAdded} lines were committed in a single commit (${commits[0]!.hash.slice(0, 7)}) without incremental progress.`
    );
  }

  // 2. Rapid typing velocity:
  // If multiple commits or single commit introduced code at an unnatural velocity (>150 lines in < 2 minutes)
  if (commits.length >= 1 && totalLinesAdded >= 150 && durationMinutes < 2) {
    signals.rapidVelocity = true;
    details.push(
      `Unnatural velocity: ${totalLinesAdded} lines appeared within ${durationMinutes} minute(s), indicating wholesale copy-paste.`
    );
  }

  // 3. Author mismatch:
  // Check if commits belong to a different author than logged in student
  if (expectedUsername && commits.length > 0) {
    const hasMatchingAuthor = authorsList.some((author) => {
      const norm = author.toLowerCase();
      const normUser = expectedUsername.toLowerCase();
      const normEmail = expectedEmail ? expectedEmail.toLowerCase() : "";
      return norm.includes(normUser) || (normEmail && norm.includes(normEmail));
    });

    if (!hasMatchingAuthor && authorsList.length > 0) {
      signals.authorMismatch = true;
      details.push(
        `Author identity mismatch: Commits authored by [${authorsList.join(", ")}], but signed-in intern is @${expectedUsername}.`
      );
    }
  }

  // 4. Insufficient progression:
  // Exercises requiring substantial code have only 1 generic commit with little detail
  if (commits.length === 1 && totalLinesAdded >= 80 && /^(?:done|fix|add|update|commit|\.)$/i.test(commits[0]!.subject.trim())) {
    signals.insufficientProgression = true;
    details.push(
      `Vague commit lifecycle: Single commit with generic message '${commits[0]!.subject}' lacks software development traceability.`
    );
  }

  // 5. AI watermarks
  const watermarkCheck = scanFilesForAiWatermarks(folderPath);
  if (watermarkCheck.found) {
    signals.aiWatermarksDetected = true;
    details.push(`AI commentary watermarks detected: ${watermarkCheck.matches.join("; ")}`);
  }

  // Determine Risk Level & Confidence
  let flaggedCount = 0;
  if (signals.monolithicCommit) flaggedCount += 2;
  if (signals.rapidVelocity) flaggedCount += 2;
  if (signals.authorMismatch) flaggedCount += 3;
  if (signals.aiWatermarksDetected) flaggedCount += 3;
  if (signals.insufficientProgression) flaggedCount += 1;

  let riskLevel: CheatingRiskLevel = "CLEAN";
  let proposedMarkCap = 1.0;
  let proposedMarkPenalty = 0.0;

  if (flaggedCount >= 4) {
    riskLevel = "FLAGGED";
    proposedMarkCap = 0.3;
    proposedMarkPenalty = 0.7;
  } else if (flaggedCount >= 2) {
    riskLevel = "HIGH";
    proposedMarkCap = 0.5;
    proposedMarkPenalty = 0.5;
  } else if (flaggedCount === 1) {
    riskLevel = "LOW";
    proposedMarkCap = 0.85;
    proposedMarkPenalty = 0.15;
  }

  const isCheatingSuspected = riskLevel === "HIGH" || riskLevel === "FLAGGED";
  const confidenceScore = Math.min(1.0, flaggedCount * 0.25);

  let findingsSummary = "";
  if (!isCheatingSuspected && details.length === 0) {
    findingsSummary = `Clean genuine progression: ${commits.length || 1} commit(s), ${totalLinesAdded} additions authored by verified student.`;
  } else {
    findingsSummary = `Integrity alert [${riskLevel}]: ${details.join(" ")}`;
  }

  return {
    isCheatingSuspected,
    riskLevel,
    confidenceScore,
    signals,
    details,
    findingsSummary,
    gitMetrics: {
      totalCommits: commits.length,
      totalLinesAdded,
      totalLinesDeleted,
      durationMinutes,
      authorList: authorsList,
    },
    proposedMarkPenalty,
    proposedMarkCap,
  };
}

export interface ExerciseWorkDetectionResult {
  hasWork: boolean;
  codeLinesCount: number;
  implementationFiles: string[];
  unmodifiedStarters: string[];
  summaryMessage: string;
  reason?: string;
  codeSnippet?: string;
}

const CODE_EXTENSIONS = new Set([
  ".py",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".html",
  ".css",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".rs",
  ".go",
  ".java",
  ".sh",
  ".sql",
]);

const IGNORED_FILENAMES = new Set([
  "exercise.md",
  "readme.md",
  "cohort.json",
  "grading.yml",
  ".gitignore",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
]);

/**
 * Checks if a code line is genuine implementation vs comments, blank, or placeholder stubs
 */
export function isSubstantiveCodeLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("*/")
  ) {
    return false;
  }
  if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
    return false;
  }
  const stubPatterns = [
    /^pass\b/i,
    /^\.\.\.$/,
    /^return\s*(None|null|undefined|{}|\[\]|""|0)?\s*;?$/i,
    /^raise\s+NotImplementedError(\(.*\))?/i,
    /^throw\s+new\s+Error\s*\(.*(todo|not implemented).*\)/i,
    /^\/\/\s*TODO/i,
    /^#\s*TODO/i,
    /^TODO\b/i,
  ];
  for (const pat of stubPatterns) {
    if (pat.test(trimmed)) return false;
  }
  return true;
}

/**
 * Detects whether the student has genuinely implemented code in their exercise directory or git branch.
 * Distinguishes untouched starter templates/empty files from real student contributions.
 */
export function detectExerciseWorkInFolder(
  folderPath: string,
  options: { module?: string; day?: number; studentUsername?: string } = {},
): ExerciseWorkDetectionResult {
  let targetDir = folderPath;
  if (!fs.existsSync(targetDir)) {
    return {
      hasWork: false,
      codeLinesCount: 0,
      implementationFiles: [],
      unmodifiedStarters: [],
      summaryMessage: "Exercise folder does not exist.",
      reason: `Folder not found: ${targetDir}`,
    };
  }

  if (options.day) {
    const candidateDay = path.join(targetDir, `day_${options.day}`);
    if (fs.existsSync(candidateDay) && fs.statSync(candidateDay).isDirectory()) {
      targetDir = candidateDay;
    } else if (options.module) {
      const candidateNested = path.join(targetDir, options.module, `day_${options.day}`);
      if (fs.existsSync(candidateNested) && fs.statSync(candidateNested).isDirectory()) {
        targetDir = candidateNested;
      }
    }
  }

  let gitDiffLines = 0;
  let gitDiffOutput = "";
  try {
    gitDiffOutput = execSync("git diff HEAD~1", {
      cwd: folderPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    if (!gitDiffOutput.trim()) {
      gitDiffOutput = execSync("git diff HEAD", {
        cwd: folderPath,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    }
    const additions = gitDiffOutput
      .split("\n")
      .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
      .map((l) => l.slice(1))
      .filter(isSubstantiveCodeLine);
    gitDiffLines = additions.length;
  } catch {
    // Not a git repo or diff failed
  }

  const implementationFiles: string[] = [];
  const unmodifiedStarters: string[] = [];
  let totalCodeLines = 0;
  let codeSnippet = "";

  function scanDir(dir: string, depth = 0): void {
    if (depth > 4) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__") continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const lowerName = entry.name.toLowerCase();
          const ext = path.extname(lowerName);
          if (IGNORED_FILENAMES.has(lowerName)) continue;
          if (!CODE_EXTENSIONS.has(ext)) continue;

          try {
            const content = fs.readFileSync(fullPath, "utf8");
            const lines = content.split("\n");
            const substantive = lines.filter(isSubstantiveCodeLine);

            if (substantive.length >= 2) {
              implementationFiles.push(path.relative(folderPath, fullPath));
              totalCodeLines += substantive.length;
              if (!codeSnippet) {
                codeSnippet = substantive.slice(0, 50).join("\n");
              }
            } else {
              unmodifiedStarters.push(path.relative(folderPath, fullPath));
            }
          } catch {
            // ignore read error
          }
        }
      }
    } catch {
      // ignore
    }
  }

  scanDir(targetDir);

  const hasWork = totalCodeLines >= 2 || gitDiffLines >= 2;
  const effectiveCodeLines = Math.max(totalCodeLines, gitDiffLines);

  if (!hasWork) {
    return {
      hasWork: false,
      codeLinesCount: 0,
      implementationFiles,
      unmodifiedStarters,
      summaryMessage: "No task was done: Exercise files are empty or contain only untouched starter boilerplate.",
      reason: "No practical implementation detected in the exercise folder.",
      codeSnippet: "",
    };
  }

  return {
    hasWork: true,
    codeLinesCount: effectiveCodeLines,
    implementationFiles,
    unmodifiedStarters,
    summaryMessage: `Practical implementation detected: ${effectiveCodeLines} line(s) of code across ${implementationFiles.length || 1} file(s).`,
    codeSnippet,
  };
}
