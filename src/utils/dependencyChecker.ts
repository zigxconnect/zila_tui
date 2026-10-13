import { execSync } from "child_process";

export interface DependencyCheckResult {
  name: string;
  command: string;
  installed: boolean;
  version?: string;
  path?: string;
  required: string;
}

export interface EnvironmentDiagnostics {
  allInstalled: boolean;
  node: DependencyCheckResult;
  python: DependencyCheckResult;
  git: DependencyCheckResult;
}

/**
 * Checks whether Node.js, Python and Git are installed and returns their versions.
 */
export function checkEnvironmentDependencies(): EnvironmentDiagnostics {
  const nodeResult = checkNode();
  const pythonResult = checkPython();
  const gitResult = checkGit();

  const allInstalled = nodeResult.installed && pythonResult.installed && gitResult.installed;

  return {
    allInstalled,
    node: nodeResult,
    python: pythonResult,
    git: gitResult,
  };
}

function checkNode(): DependencyCheckResult {
  try {
    const rawVersion = execSync("node -v", { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim();
    const version = rawVersion.startsWith("v") ? rawVersion : `v${rawVersion}`;
    return {
      name: "Node.js Runtime",
      command: "node",
      installed: true,
      version,
      required: ">= 18.0.0",
    };
  } catch {
    return {
      name: "Node.js Runtime",
      command: "node",
      installed: false,
      required: ">= 18.0.0",
    };
  }
}

function checkPython(): DependencyCheckResult {
  // Test python3 first, then fallback to python
  const commands = ["python3 --version", "python --version"];
  for (const cmd of commands) {
    try {
      const output = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim();
      const match = output.match(/Python\s+([0-9.]+)/i);
      const version = match ? match[1] : output;
      return {
        name: "Python Environment",
        command: cmd.split(" ")[0]!,
        installed: true,
        version: `v${version}`,
        required: ">= 3.10",
      };
    } catch {
      // try next command
    }
  }

  return {
    name: "Python Environment",
    command: "python3",
    installed: false,
    required: ">= 3.10",
  };
}

function checkGit(): DependencyCheckResult {
  try {
    const output = execSync("git --version", { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim();
    const match = output.match(/git\s+version\s+([0-9.]+)/i);
    const version = match ? `v${match[1]}` : output;
    return {
      name: "Git Version Control",
      command: "git",
      installed: true,
      version,
      required: ">= 2.20",
    };
  } catch {
    return {
      name: "Git Version Control",
      command: "git",
      installed: false,
      required: ">= 2.20",
    };
  }
}
