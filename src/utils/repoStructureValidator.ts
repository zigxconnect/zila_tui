import fs from "node:fs";
import path from "node:path";
import { loadGitHubAuth } from "./githubAuth.js";

export interface ExerciseFileFinding {
  path: string;
  ext: string;
  languageType: "python" | "javascript" | "html" | "markdown" | "other";
}

export interface RepoValidationResult {
  valid: boolean;
  score: number; // 0 to 100
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  totalFilesScanned: number;
  checks: {
    hasTracksOrModules: boolean;
    hasDayFolders: boolean;
    hasExerciseCodeFiles: boolean;
    hasTemplate: boolean;
    hasContributorsDir: boolean;
    hasSupervisorInstructions: boolean;
  };
  detectedTracks: string[];
  detectedModules: string[];
  detectedDaysCount: number;
  exerciseFiles: ExerciseFileFinding[];
  exerciseLanguagesSummary: Record<string, number>;
  warnings: string[];
  errors: string[];
  summary: string;
}

/**
 * Checks a file list (from GitHub tree or local directory) against Zila prototype standards.
 */
export function validateFileListAgainstPrototype(
  files: string[],
  repoUrl: string,
  owner: string,
  repo: string,
  branch: string = "main",
): RepoValidationResult {
  const detectedTracks = new Set<string>();
  const detectedModules = new Set<string>();
  const dayFolders = new Set<string>();
  const exerciseFiles: ExerciseFileFinding[] = [];
  const exerciseLanguagesSummary: Record<string, number> = {
    markdown: 0,
    python: 0,
    javascript: 0,
    html: 0,
    other: 0,
  };

  let hasTemplate = false;
  let hasContributorsDir = false;
  let hasSupervisorInstructions = false;

  for (const rawPath of files) {
    const norm = rawPath.replace(/\\/g, "/");
    const lower = norm.toLowerCase();

    // Check track levels (beginner, intermediate, advanced, etc.)
    const trackMatch = norm.match(/^(?:beginner|intermediate|advanced|fundamentals)/i);
    if (trackMatch) {
      detectedTracks.add(trackMatch[0].toLowerCase());
    }

    // Check module folders: 1_python, 2_react, etc.
    const modMatch = norm.match(/(?:^|\/)([0-9]+_[a-zA-Z0-9_]+)(?:\/|$)/);
    if (modMatch && modMatch[1]) {
      detectedModules.add(modMatch[1]);
    }

    // Check day folders: day_1, day-2, etc.
    const dayMatch = norm.match(/(?:^|\/)day[_-]?([0-9]+)(?:\/|$)/i);
    if (dayMatch) {
      dayFolders.add(dayMatch[0].replace(/^\/|\/$/g, ""));
    }

    // Deliverable template
    if (lower.includes("templates/exercise.md") || lower.includes("pull_request_template.md")) {
      hasTemplate = true;
    }

    // Contributors directory
    if (lower.startsWith("contributors/") || lower === "contributors") {
      hasContributorsDir = true;
    }

    // Supervisor instructions
    if (
      lower.includes(".supervisor_instructions") ||
      lower.includes("supervisor_instructions.json") ||
      lower.includes(".instructions.md") ||
      lower.includes("instructions.md")
    ) {
      hasSupervisorInstructions = true;
    }

    // Check exercise files inside day or module folders (.md, .py, .js, .ts, .html, etc.)
    if (dayMatch || modMatch) {
      const ext = path.extname(norm).toLowerCase();
      if ([".md", ".py", ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".json", ".c", ".cpp", ".rs", ".go"].includes(ext)) {
        let lang: "python" | "javascript" | "html" | "markdown" | "other" = "other";
        if (ext === ".py") lang = "python";
        else if ([".js", ".ts", ".jsx", ".tsx"].includes(ext)) lang = "javascript";
        else if (ext === ".html") lang = "html";
        else if (ext === ".md") lang = "markdown";

        exerciseLanguagesSummary[lang] = (exerciseLanguagesSummary[lang] || 0) + 1;
        exerciseFiles.push({
          path: norm,
          ext: ext.replace(/^\./, ""),
          languageType: lang,
        });
      }
    }
  }

  const checks = {
    hasTracksOrModules: detectedTracks.size > 0 || detectedModules.size > 0,
    hasDayFolders: dayFolders.size > 0,
    hasExerciseCodeFiles: exerciseFiles.length > 0,
    hasTemplate,
    hasContributorsDir,
    hasSupervisorInstructions,
  };

  const warnings: string[] = [];
  const errors: string[] = [];

  if (!checks.hasTracksOrModules) {
    errors.push("Missing track folders (beginner/, intermediate/, advanced/) or numbered curriculum modules (e.g. 1_python/).");
  }
  if (!checks.hasDayFolders) {
    warnings.push("No day subfolders (day_1, day_2...) detected in modules.");
  }
  if (!checks.hasExerciseCodeFiles) {
    warnings.push("No starter code or guide files (.md, .py, .js, .html) found in exercise modules.");
  }
  if (!checks.hasTemplate) {
    warnings.push("Missing templates/exercise.md deliverable report template.");
  }
  if (!checks.hasContributorsDir) {
    warnings.push("Missing contributors/ directory for intern student workspaces.");
  }

  // Scoring
  let score = 0;
  if (checks.hasTracksOrModules) score += 30;
  if (checks.hasDayFolders) score += 20;
  if (checks.hasExerciseCodeFiles) score += 20;
  if (checks.hasTemplate) score += 15;
  if (checks.hasContributorsDir) score += 10;
  if (checks.hasSupervisorInstructions) score += 5;

  const valid = errors.length === 0 && score >= 50;

  return {
    valid,
    score,
    repoUrl,
    owner,
    repo,
    branch,
    totalFilesScanned: files.length,
    checks,
    detectedTracks: Array.from(detectedTracks),
    detectedModules: Array.from(detectedModules),
    detectedDaysCount: dayFolders.size,
    exerciseFiles,
    exerciseLanguagesSummary,
    warnings,
    errors,
    summary: valid
      ? `Repository complies with Zila cohort standards (${score}% structural readiness).`
      : `Repository does not yet match Zila prototype structure (${score}% readiness).`,
  };
}

/**
 * Scans a remote GitHub repository tree using GitHub REST API.
 */
export async function validateRemoteGitHubRepo(
  repoUrl: string,
  branchOverride?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RepoValidationResult> {
  const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?/i);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid GitHub repository URL: "${repoUrl}"`);
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  const ghAuth = loadGitHubAuth();
  const token = ghAuth?.token || process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Zila-Agent-Repo-Validator",
  };
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  // Detect default branch
  let targetBranch = branchOverride;
  if (!targetBranch) {
    try {
      const repoRes = await fetchImpl(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (repoRes.ok) {
        const repoData: any = await repoRes.json();
        targetBranch = repoData.default_branch || "main";
      }
    } catch {
      targetBranch = "main";
    }
  }
  targetBranch = targetBranch || "main";

  let files: string[] = [];
  try {
    const treeRes = await fetchImpl(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
      { headers },
    );

    if (treeRes.ok) {
      const treeData: any = await treeRes.json();
      if (Array.isArray(treeData.tree)) {
        files = treeData.tree.map((item: any) => item.path);
      }
    } else if (targetBranch === "main") {
      // Retry master branch fallback
      const masterRes = await fetchImpl(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`,
        { headers },
      );
      if (masterRes.ok) {
        const masterData: any = await masterRes.json();
        if (Array.isArray(masterData.tree)) {
          files = masterData.tree.map((item: any) => item.path);
          targetBranch = "master";
        }
      }
    }
  } catch (err: any) {
    // If network or permission error, return structured report with network failure
    return {
      valid: false,
      score: 0,
      repoUrl,
      owner,
      repo,
      branch: targetBranch,
      totalFilesScanned: 0,
      checks: {
        hasTracksOrModules: false,
        hasDayFolders: false,
        hasExerciseCodeFiles: false,
        hasTemplate: false,
        hasContributorsDir: false,
        hasSupervisorInstructions: false,
      },
      detectedTracks: [],
      detectedModules: [],
      detectedDaysCount: 0,
      exerciseFiles: [],
      exerciseLanguagesSummary: {},
      warnings: [],
      errors: [`Could not access repository tree: ${err.message || "Network error"}`],
      summary: "Repository scan failed due to network or repository permissions.",
    };
  }

  return validateFileListAgainstPrototype(files, repoUrl, owner, repo, targetBranch);
}

/**
 * Scans a local directory on disk against Zila prototype structure.
 */
export function validateLocalRepoPath(folderPath: string): RepoValidationResult {
  const files: string[] = [];

  function walk(current: string) {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      const full = path.join(current, e.name);
      const rel = path.relative(folderPath, full).replace(/\\/g, "/");
      if (e.isDirectory()) {
        walk(full);
      } else {
        files.push(rel);
      }
    }
  }

  walk(folderPath);

  return validateFileListAgainstPrototype(
    files,
    folderPath,
    "local",
    path.basename(folderPath),
    "local",
  );
}
