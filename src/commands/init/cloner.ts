import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { withRetry } from "../../utils/retry";

const execAsync = promisify(exec);

export async function cloneRepo(
  repoUrl: string,
  targetDir: string,
  onRetry?: (attempt: number, error: Error) => void,
): Promise<boolean> {
  if (fs.existsSync(targetDir)) {
    return false; // Already exists, skip cloning
  }

  await withRetry(
    async () => {
      await execAsync(`git clone ${repoUrl} ${targetDir}`);
    },
    { maxAttempts: 3, baseDelaysMs: 1000, ...(onRetry && { onRetry }) },
  );
  return true; // Cloned successfully
}
