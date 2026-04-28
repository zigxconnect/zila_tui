import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface CheckResult {
  passed: boolean;
  /** Human-readable version string when passed, e.g. "2.43.0" */
  version?: string;
  /** Actionable error message when not passed */
  error?: string;
}

// ── git ───────────────────────────────────────────────────────────────────────

export async function checkGit(): Promise<CheckResult> {
  try {
    const { stdout } = await execAsync("git --version");
    const match = stdout.match(/git version (\d+\.\d+\.\d+)/);
    return {
      passed: true,
      version: `git ${match?.[1] ?? "unknown"}`,
    };
  } catch {
    return {
      passed: false,
      error:
        "git is not installed.\n" +
        "Install it at: https://git-scm.com/downloads\n" +
        "Then run  zila init  again.",
    };
  }
}

// ── node ──────────────────────────────────────────────────────────────────────

const MIN_NODE_MAJOR = 18;

export async function checkNode(): Promise<CheckResult> {
  try {
    const { stdout } = await execAsync("node --version");
    const version = stdout.trim(); // e.g. "v22.0.0"
    const majorStr = version.replace("v", "").split(".")[0];
    const major = parseInt(majorStr ?? "0", 10);

    if (major < MIN_NODE_MAJOR) {
      return {
        passed: false,
        version,
        error:
          `Node ${version} found — ZILA needs Node ≥ ${MIN_NODE_MAJOR}.\n` +
          "Upgrade at: https://nodejs.org\n" +
          "We recommend using nvm for easy version management.",
      };
    }

    return { passed: true, version: `node ${version}` };
  } catch {
    return {
      passed: false,
      error:
        `Node.js is not installed. ZILA needs Node ≥ ${MIN_NODE_MAJOR}.\n` +
        "Install it at: https://nodejs.org",
    };
  }
}
