import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync, spawn } from "node:child_process";
import { getActiveCohort } from "./activeCohort.js";
import { parseGitHubRepoUrl } from "./githubPrAutomation.js";
import { API_BASE, loadAuth } from "./auth.js";
import { loadGitHubAuth } from "./githubAuth.js";

export interface WorkspaceRepoInfo {
  repoUrl: string;
  repoName: string;
  localPath: string;
  isCloned: boolean;
  branch: string;
}

export interface WorkspaceFileEntry {
  name: string;
  relativePath: string;
  isDir: boolean;
  size?: number;
}

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".cache",
  "__pycache__",
  ".pytest_cache",
  ".idea",
  ".vscode",
  ".ipynb_checkpoints",
]);

export function getDefaultWorkspacesDir(): string {
  const dir = path.join(os.homedir(), ".zila", "workspaces");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

/**
 * Resolves the supervisor's repository for the current intern.
 * Checks active cohort, current working directory, and local workspaces folder.
 */
export async function resolveSupervisorRepo(cwd: string = process.cwd()): Promise<WorkspaceRepoInfo> {
  const activeCohort = getActiveCohort();
  let repoUrl = activeCohort?.githubRepoUrl;

  // If not in activeCohort, attempt fetching from API
  if (!repoUrl) {
    const auth = loadAuth();
    if (auth?.token) {
      try {
        const apiBaseUrl = API_BASE.replace(/\/api$/, "");
        const res = await fetch(`${apiBaseUrl}/api/github/active`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.primaryRepoUrl) {
            repoUrl = data.primaryRepoUrl;
          }
        }
      } catch {
        // Ignore API failure, fallback
      }
    }
  }

  // Fallback to parseGitHubRepoUrl
  const parsed = parseGitHubRepoUrl(repoUrl, cwd);
  const finalRepoUrl = parsed.url;
  const repoName = parsed.repo;

  // Determine local paths to check:
  // 1. Current working directory if it's already a clone of this repo
  let localPath = "";
  let isCloned = false;

  try {
    const currentOrigin = execSync("git remote get-url origin", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (currentOrigin.toLowerCase().includes(repoName.toLowerCase())) {
      localPath = cwd;
      isCloned = true;
    }
  } catch {
    // Current dir is not a git repo or different origin
  }

  if (!isCloned) {
    // 2. Check ./<repoName> in cwd
    const relativeInCwd = path.join(cwd, repoName);
    if (fs.existsSync(relativeInCwd) && fs.existsSync(path.join(relativeInCwd, ".git"))) {
      localPath = relativeInCwd;
      isCloned = true;
    }
  }

  if (!isCloned) {
    // 3. Check ~/.zila/workspaces/<repoName>
    const inZilaWorkspaces = path.join(getDefaultWorkspacesDir(), repoName);
    if (fs.existsSync(inZilaWorkspaces) && fs.existsSync(path.join(inZilaWorkspaces, ".git"))) {
      localPath = inZilaWorkspaces;
      isCloned = true;
    } else {
      localPath = inZilaWorkspaces;
      isCloned = false;
    }
  }

  let branch = "main";
  if (isCloned) {
    try {
      branch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: localPath,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      branch = "main";
    }
  }

  return {
    repoUrl: finalRepoUrl,
    repoName,
    localPath,
    isCloned,
    branch,
  };
}

/**
 * Clones or pulls the supervisor repository to local disk.
 */
export async function ensureSupervisorRepoCloned(
  repoUrl: string,
  targetPath: string,
): Promise<{ success: boolean; path: string; error?: string }> {
  try {
    if (fs.existsSync(targetPath) && fs.existsSync(path.join(targetPath, ".git"))) {
      // Pull latest updates
      try {
        execSync("git pull", { cwd: targetPath, stdio: ["ignore", "ignore", "ignore"] });
      } catch {
        // Pull failure shouldn't block viewing existing files
      }
      return { success: true, path: targetPath };
    }

    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    }

    const ghAuth = loadGitHubAuth();
    const env = { ...process.env };
    if (ghAuth?.token) {
      env.GIT_CONFIG_COUNT = "1";
      env.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
      env.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${ghAuth.token}`).toString("base64")}`;
    }

    execSync(`git clone --depth 1 "${repoUrl}" "${targetPath}"`, {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    return { success: true, path: targetPath };
  } catch (err: any) {
    return {
      success: false,
      path: targetPath,
      error: err.message || "Failed to clone repository.",
    };
  }
}

/**
 * Lists files and directories in a workspace directory.
/**
 * Determines whether the current active user has supervisor or administrator privileges.
 */
export function isSupervisorUser(): boolean {
  if (process.env.ZILA_ROLE === "supervisor" || process.env.ZILA_ROLE === "admin") {
    return true;
  }
  const auth = loadAuth();
  const active = getActiveCohort();
  if (
    active?.supervisorEmail &&
    auth?.email &&
    active.supervisorEmail.toLowerCase() === auth.email.toLowerCase()
  ) {
    return true;
  }
  return false;
}

/**
 * Checks whether a given path or filename is a critical supervisor file
 * (grading keys, supervisor rubrics, solutions, or secret environment keys)
 * that must NEVER be accessible to students.
 */
export function isCriticalFile(filePath: string): boolean {
  const normalized = filePath.toLowerCase().replace(/\\/g, "/");
  const baseName = path.basename(normalized);

  // 1. Solution files or directories
  if (
    normalized === "solution" ||
    normalized.startsWith("solution/") ||
    normalized.includes("/solution/") ||
    normalized === "solutions" ||
    normalized.startsWith("solutions/") ||
    normalized.includes("/solutions/") ||
    baseName === "solution.py" ||
    baseName === "solution.ts" ||
    baseName === "solution.js" ||
    baseName === "solution.md" ||
    baseName === "solutions.json" ||
    baseName.includes(".solution.") ||
    baseName.startsWith("solution_") ||
    baseName.startsWith("solutions_")
  ) {
    return true;
  }

  // 2. Supervisor instruction rubrics, grading files & evaluator keys
  if (
    baseName === "grading.yml" ||
    baseName === "grading.yaml" ||
    baseName.startsWith(".supervisor") ||
    baseName.startsWith("supervisor_instructions") ||
    baseName.startsWith("supervisor_notes") ||
    baseName.includes("rubric_private") ||
    baseName.includes("private_rubric") ||
    baseName === ".rubric.secret" ||
    baseName === ".evaluator_keys"
  ) {
    return true;
  }

  // 3. Environment files & secrets
  if (
    baseName === ".env" ||
    baseName.startsWith(".env.") ||
    baseName === "credentials.json" ||
    baseName.endsWith(".secret") ||
    baseName.endsWith(".key") ||
    baseName.endsWith(".pem")
  ) {
    return true;
  }

  return false;
}

/**
 * Lists files and directories in a workspace directory.
 * Automatically filters out critical supervisor files for students.
 */
export function listWorkspaceFiles(
  rootDir: string,
  subRelative: string = "",
  isSupervisor: boolean = isSupervisorUser(),
): WorkspaceFileEntry[] {
  const targetDir = path.join(rootDir, subRelative);
  if (!fs.existsSync(targetDir)) return [];

  try {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const results: WorkspaceFileEntry[] = [];

    for (const ent of entries) {
      if (IGNORED_DIRS.has(ent.name) || ent.name.startsWith(".")) continue;

      const rel = subRelative ? path.join(subRelative, ent.name) : ent.name;
      const full = path.join(targetDir, ent.name);

      // Hide critical supervisor files from students
      if (!isSupervisor && isCriticalFile(rel)) {
        continue;
      }

      if (ent.isDirectory()) {
        results.push({
          name: `${ent.name}/`,
          relativePath: rel,
          isDir: true,
        });
      } else if (ent.isFile()) {
        let size = 0;
        try {
          size = fs.statSync(full).size;
        } catch {
          // ignore
        }
        results.push({
          name: ent.name,
          relativePath: rel,
          isDir: false,
          size,
        });
      }
    }

    // Sort directories first, then alphabetically
    return results.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch {
    return [];
  }
}

/**
 * Reads file contents from a workspace file safely.
 * Blocks students from reading critical supervisor files.
 */
export function readWorkspaceFile(
  fullPath: string,
  maxLines: number = 200,
  isSupervisor: boolean = isSupervisorUser(),
): { success: boolean; content: string; lines: number; error?: string } {
  try {
    if (!isSupervisor && isCriticalFile(fullPath)) {
      return {
        success: false,
        content: "",
        lines: 0,
        error: "Access Denied: Critical file reserved for supervisors only.",
      };
    }
    if (!fs.existsSync(fullPath)) {
      return { success: false, content: "", lines: 0, error: "File does not exist." };
    }
    const stat = fs.statSync(fullPath);
    if (stat.size > 1024 * 512) {
      return { success: false, content: "", lines: 0, error: "File exceeds 512KB display limit." };
    }
    const text = fs.readFileSync(fullPath, "utf8");
    const allLines = text.split("\n");
    const clamped = allLines.slice(0, maxLines).join("\n");
    return { success: true, content: clamped, lines: allLines.length };
  } catch (err: any) {
    return { success: false, content: "", lines: 0, error: err.message || "Could not read file." };
  }
}

/**
 * Saves edits to a workspace file.
 * Blocks students from overwriting critical supervisor files.
 */
export function saveWorkspaceFile(
  fullPath: string,
  content: string,
  isSupervisor: boolean = isSupervisorUser(),
): { success: boolean; error?: string } {
  try {
    if (!isSupervisor && isCriticalFile(fullPath)) {
      return {
        success: false,
        error: "Access Denied: Critical file modification restricted to supervisors only.",
      };
    }
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, "utf8");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save file." };
  }
}

/**
 * Opens a file or repository in an external desktop or terminal editor (VS Code, Cursor, $EDITOR).
 */
export function openInExternalEditor(targetPath: string): { success: boolean; message: string } {
  try {
    const editors = ["code", "cursor", "subl", "gedit", "nano", "vim", "vi"];
    const preferredEditor = process.env.VISUAL || process.env.EDITOR;
    const candidates = preferredEditor ? [preferredEditor, ...editors] : editors;

    for (const ed of candidates) {
      try {
        const child = spawn(ed, [targetPath], {
          detached: true,
          stdio: "ignore",
          shell: false,
        });
        child.on("error", () => {});
        child.unref();
        return { success: true, message: `Opened in ${ed}: ${path.basename(targetPath)}` };
      } catch {
        continue;
      }
    }

    return {
      success: false,
      message: "No external editor (code, cursor, nano) could be launched automatically.",
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to launch editor." };
  }
}
