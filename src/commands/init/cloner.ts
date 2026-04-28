import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { withRetry } from "../../utils/retry.js";

const execAsync = promisify(exec);

export interface CloneResult {
  cloned: boolean;
}

export async function cloneRepo(
  repoUrl: string,
  targetDir: string,
  onRetry?: (attempt: number, error: Error) => void,
): Promise<CloneResult> {
  // Already present — nothing to do
  if (fs.existsSync(targetDir)) {
    return { cloned: false };
  }

  await withRetry(
    async () => {
      await execAsync(`git clone --depth 1 ${repoUrl} ${targetDir}`);
    },
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      onRetry,
    },
  );

  return { cloned: true };
}
