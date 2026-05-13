import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const GIT_TIMEOUT = 10_000;

function git(repoPath: string, args: string[]): string {
  try {
    return execSync(`git -C "${repoPath}" ${args.join(" ")}`, {
      timeout: GIT_TIMEOUT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

export function isGitRepo(repoPath: string): boolean {
  return git(repoPath, ["rev-parse", "--is-inside-work-tree"]) === "true";
}

export function getRepoName(repoPath: string): string {
  const remote = git(repoPath, ["remote", "get-url", "origin"]);
  if (remote) {
    const match = remote.match(/([^/\\]+?)(?:\.git)?$/);
    if (match && match[1]) return match[1];
  }
  return path.basename(repoPath);
}

export function getActiveBranch(repoPath: string): string {
  return git(repoPath, ["branch", "--show-current"]) || "HEAD";
}

export function getRepoStats(repoPath: string): {
  branch: string;
  commitCount: string;
  lastCommit: string;
} {
  const branch = getActiveBranch(repoPath);
  const commitCount = git(repoPath, ["rev-list", "--count", "HEAD"]) || "0";
  const lastCommit =
    git(repoPath, ["log", "-1", "--pretty=format:%ar"]) || "unknown";
  return { branch, commitCount, lastCommit };
}

export function getDirectoryTree(repoPath: string): string {
  const out = git(repoPath, [
    "ls-files",
    "--others",
    "--cached",
    "--exclude-standard",
  ]);
  if (!out) return "No tracked files found.";
  const files = out.split("\n").filter(Boolean);
  const tree: Record<string, string[]> = {};
  for (const file of files) {
    const dir = path.dirname(file);
    const key = dir === "." ? "(root)" : dir;
    if (!tree[key]) tree[key] = [];
    tree[key].push(path.basename(file));
  }
  const lines: string[] = [`Total tracked files: ${files.length}\n`];
  for (const [dir, dirFiles] of Object.entries(tree)) {
    lines.push(`${dir}/`);
    for (const f of dirFiles) lines.push(`  ${f}`);
  }
  return lines.join("\n");
}

export function getRecentCommits(repoPath: string, limit = 20): string {
  const out = git(repoPath, [
    "log",
    `-n${limit}`,
    "--pretty=format:%h | %an | %ad | %s",
    "--date=short",
    "--stat",
  ]);
  return out || "No commits found.";
}

export function getUncommittedChanges(repoPath: string): string {
  const staged = git(repoPath, ["diff", "--cached"]);
  const unstaged = git(repoPath, ["diff"]);
  const untracked = git(repoPath, [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  const parts: string[] = [];
  if (staged) parts.push(`=== STAGED CHANGES ===\n${staged}`);
  if (unstaged) parts.push(`=== UNSTAGED CHANGES ===\n${unstaged}`);
  if (untracked) parts.push(`=== UNTRACKED FILES ===\n${untracked}`);
  return parts.length ? parts.join("\n\n") : "No uncommitted changes.";
}

export function getLastDiff(repoPath: string): string {
  const out = git(repoPath, ["show", "HEAD", "--stat", "--patch"]);
  return out || "No diff available.";
}

export function getFileContent(repoPath: string, filepath: string): string {
  const full = path.join(repoPath, filepath);
  if (!fs.existsSync(full))
    return `File '${filepath}' does not exist in the repository.`;
  try {
    const content = fs.readFileSync(full, { encoding: "utf-8" });
    if (!content.trim()) return `File '${filepath}' is empty.`;
    const lines = content.split("\n");
    return lines.map((l, i) => `${String(i + 1).padStart(4)}: ${l}`).join("\n");
  } catch {
    return `Error reading file '${filepath}'.`;
  }
}

export function readReadme(repoPath: string, filepath = "README.md"): string {
  const candidates = [
    filepath,
    "README.md",
    "readme.md",
    "README.txt",
    "README",
  ];
  for (const c of candidates) {
    const full = path.join(repoPath, c);
    if (fs.existsSync(full)) {
      try {
        return (
          fs.readFileSync(full, { encoding: "utf-8" }).trim() ||
          "README is empty."
        );
      } catch {
        continue;
      }
    }
  }
  return "No README file found in the repository root.";
}

export function searchCode(
  repoPath: string,
  pattern: string,
  fileGlob?: string,
): string {
  try {
    const globPart = fileGlob ? `--include="${fileGlob}"` : "";
    const result = execSync(
      `git -C "${repoPath}" grep -n --heading ${globPart} "${pattern.replace(/"/g, '\\"')}"`,
      {
        timeout: GIT_TIMEOUT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    ).trim();
    return result || `No matches found for '${pattern}'.`;
  } catch {
    return `No matches found for '${pattern}'.`;
  }
}

export function getContributors(repoPath: string): string {
  const out = git(repoPath, ["shortlog", "-sne", "--all"]);
  return out || "No contributor data available.";
}
