import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getActiveCohort } from "./activeCohort.js";

export interface WorkspaceContext {
  cohortName?: string;
  domain?: string;
  gitBranch?: string;
  recentCommits: string[];
  exerciseFile?: {
    path: string;
    content: string;
  };
  workingDirectory: string;
}

/**
 * Gathers relevant workspace context for the AI pair programmer:
 * - Active cohort
 * - Current Git branch & last commits
 * - Nearest exercise or code files
 */
export function extractWorkspaceContext(cwd: string = process.cwd()): WorkspaceContext {
  const activeCohort = getActiveCohort();
  
  let gitBranch: string | undefined;
  const recentCommits: string[] = [];

  try {
    gitBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const rawCommits = execSync("git log -n 5 --oneline", { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (rawCommits) {
      recentCommits.push(...rawCommits.split("\n"));
    }
  } catch {
    // not a git repo or no commits yet
  }

  let exerciseFile: { path: string; content: string } | undefined;
  const candidateFiles = [
    "exercise.py",
    "exercise.ts",
    "exercise.js",
    "main.py",
    "index.ts",
    "README.md",
  ];

  for (const filename of candidateFiles) {
    const fullPath = path.join(cwd, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        // Limit context to first 250 lines
        const lines = content.split("\n").slice(0, 250).join("\n");
        exerciseFile = {
          path: filename,
          content: lines,
        };
        break;
      } catch {
        // ignore
      }
    }
  }

  return {
    cohortName: activeCohort?.name,
    domain: activeCohort?.domain,
    gitBranch,
    recentCommits,
    exerciseFile,
    workingDirectory: cwd,
  };
}
