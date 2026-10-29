import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { withRetry } from "../../utils/retry.js";

const execFileAsync = promisify(execFile);

export interface CloneResult {
  cloned: boolean;
}

export function validateRepositoryUrl(repoUrl: string): URL {
  const parsed = new URL(repoUrl);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("Curriculum repository URL must use HTTPS and must not contain credentials.");
  }
  return parsed;
}

export async function cloneRepo(
  repoUrl: string,
  targetDir: string,
  onRetry?: (attempt: number, error: Error) => void,
): Promise<CloneResult> {
  validateRepositoryUrl(repoUrl);
  // Already present — nothing to do
  if (fs.existsSync(targetDir)) {
    return { cloned: false };

    // Add logic to check if packages are already installed, if not, install them]
  
  }

  await withRetry(
    async () => {
      await execFileAsync("git", ["clone", "--depth", "1", repoUrl, targetDir]);
    },
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      onRetry,
    },
  );

  return { cloned: true };
}
