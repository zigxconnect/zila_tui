import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface CheckResult {
  passed: boolean;
  version?: string;
  error?: string;
}

// git

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

// node

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
          "Upgrade at: https://nodejs.org\n",
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

export async function checkPython(): Promise<CheckResult> {
  for (const bin of ["python3", "python"]) {
    try {
      const { stdout } = await execAsync(`${bin} --version`);
      const match = stdout.trim().match(/Python (\d+\.\d+\.\d+)/);
      const version = match?.[1] ?? "unknown";
      const major = parseInt(version.split(".")[0] ?? "0", 10);
      if (major < 3) continue; // skip python2
      return { passed: true, version: `python ${version} (${bin})` };
    } catch {
      continue;
    }
  }
  return {
    passed: false,
    error:
      "Python 3 is not installed. Some curriculum tracks require it.\n" +
      "Install it at: https://python.org/downloads",
  };
}
