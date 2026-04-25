import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface SystemCheckResult {
  passed: boolean;
  version?: string | undefined;
  error?: string;
}

export async function checkGit(): Promise<SystemCheckResult> {
  try {
    const { stdout } = await execAsync("git --version");
    const match = stdout.match(/git version (\d+\.\d+\.\d+)/);
    return { passed: true, version: match ? match[1] : "unknown" };
  } catch (err) {
    return { passed: false, error: "git not found" };
  }
}

export async function checkNode(): Promise<SystemCheckResult> {
  try {
    const { stdout } = await execAsync("node --version");
    const version = stdout.trim();
    const majorPart = version.replace("v", "").split(".")[0];

    if (!majorPart) {
      return {
        passed: false,
        version,
        error: "Invalid Node version format",
      };
    }

    const major = parseInt(majorPart, 10);

    if (major < 18) {
      return {
        passed: false,
        version,
        error: `Node ${version} found — ZILA needs Node ≥ 18`,
      };
    }

    return { passed: true, version };
  } catch (err) {
    return { passed: false, error: "Node not found" };
  }
}
