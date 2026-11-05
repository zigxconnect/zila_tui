import { zilaApi, isAuthenticated } from "../utils/auth.js";
import { getActiveCohort, setActiveCohort } from "../utils/activeCohort.js";
import { validateRemoteGitHubRepo, validateLocalRepoPath, type RepoValidationResult } from "../utils/repoStructureValidator.js";
import { theme } from "../ui/theme.js";
import fs from "node:fs";

export interface AttachRepoOptions {
  repoUrl?: string;
  cohortId?: string;
  confirm?: boolean;
  branch?: string;
}

export async function executeAttachRepo(
  repoArg?: string,
  options: AttachRepoOptions = {},
): Promise<string> {
  const targetRepo = repoArg || options.repoUrl;
  if (!targetRepo || !targetRepo.trim()) {
    return [
      "Usage: zila attach-repo <githubRepoUrl> [--cohort <cohortId>] [--confirm]",
      "",
      "Example:",
      "  zila attach-repo https://github.com/my-org/internship-exercises.git",
      "",
      "The agent will scan the repository tree to ensure it follows the Zila prototype structure.",
    ].join("\n");
  }

  if (!isAuthenticated()) {
    return "Error: You must be logged in to attach a repository. Run  zila auth  first.";
  }

  // 1. Verify Supervisor Role
  let userRole = "student";
  try {
    const rolesRes = await zilaApi<{ roles?: string[] }>("/profile/roles");
    if (rolesRes.roles && (rolesRes.roles.includes("supervisor") || rolesRes.roles.includes("company"))) {
      userRole = "supervisor";
    } else {
      const meRes = await zilaApi<{ type?: string }>("/profile/me");
      if (meRes.type === "supervisor" || meRes.type === "company") {
        userRole = "supervisor";
      }
    }
  } catch {
    // If roles check unavailable, check me
    try {
      const meRes = await zilaApi<{ type?: string }>("/profile/me");
      if (meRes.type === "supervisor" || meRes.type === "company") {
        userRole = "supervisor";
      }
    } catch {
      // default to student
    }
  }

  if (userRole !== "supervisor") {
    return [
      "⚠ Permission Denied: Only supervisors and administrators can attach repositories to cohorts.",
      "If you were recently promoted to a supervisor in the admin dashboard, re-authenticate with:",
      "  zila auth",
    ].join("\n");
  }

  // 2. Resolve target cohort
  let targetCohortId = options.cohortId;
  const active = getActiveCohort();
  if (!targetCohortId && active?.id) {
    targetCohortId = active.id;
  }

  if (!targetCohortId) {
    try {
      const cohortsRes = await zilaApi<{ cohorts: Array<{ id: string; name: string }> }>("/cohorts");
      if (cohortsRes.cohorts && cohortsRes.cohorts.length > 0) {
        return [
          "Please specify which cohort to attach this repository to:",
          ...cohortsRes.cohorts.map((c) => `  --cohort ${c.id}  (${c.name})`),
          "",
          `Run: zila attach-repo ${targetRepo} --cohort <id>`,
        ].join("\n");
      }
    } catch {
      return "Error: No cohort specified and could not fetch available cohorts.";
    }
  }

  // 4. Validate Repository Structure
  let validation: RepoValidationResult;
  const isLocal = fs.existsSync(targetRepo) && fs.statSync(targetRepo).isDirectory();

  if (isLocal) {
    validation = validateLocalRepoPath(targetRepo);
  } else {
    try {
      validation = await validateRemoteGitHubRepo(targetRepo, options.branch);
    } catch (err: any) {
      return `Error scanning repository: ${err.message}`;
    }
  }

  // 5. Build Summary Checklist
  const lines: string[] = [
    `◈ ZILA COHORT REPOSITORY SCANNER`,
    `Target: ${targetRepo} (branch: ${validation.branch})`,
    `Readiness Score: ${validation.score}% ${validation.valid ? "✔ PASSED" : "✖ NEEDS ADJUSTMENT"}`,
    "",
    "Structural Verification Checklist:",
    `  ${validation.checks.hasTracksOrModules ? "✔" : "✖"} Curriculum Tracks & Modules: ${validation.detectedTracks.length > 0 ? validation.detectedTracks.join(", ") : (validation.detectedModules.length > 0 ? validation.detectedModules.slice(0, 4).join(", ") : "None detected")}`,
    `  ${validation.checks.hasDayFolders ? "✔" : "✖"} Day Subfolders: ${validation.detectedDaysCount} day folder(s) found`,
    `  ${validation.checks.hasExerciseCodeFiles ? "✔" : "✖"} Exercise Starter Files: ${validation.exerciseFiles.length} file(s) (.md: ${validation.exerciseLanguagesSummary.markdown || 0}, .py: ${validation.exerciseLanguagesSummary.python || 0}, .js: ${validation.exerciseLanguagesSummary.javascript || 0}, .html: ${validation.exerciseLanguagesSummary.html || 0})`,
    `  ${validation.checks.hasTemplate ? "✔" : "✖"} Deliverable Template (templates/exercise.md): ${validation.checks.hasTemplate ? "Present" : "Missing"}`,
    `  ${validation.checks.hasContributorsDir ? "✔" : "✖"} Intern Workspaces Directory (contributors/): ${validation.checks.hasContributorsDir ? "Present" : "Missing"}`,
    `  ${validation.checks.hasSupervisorInstructions ? "✔" : "○"} Hidden Supervisor Grading Criteria: ${validation.checks.hasSupervisorInstructions ? "Detected" : "Optional"}`,
  ];

  if (validation.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    validation.warnings.forEach((w) => lines.push(`  ⚠ ${w}`));
  }

  if (validation.errors.length > 0) {
    lines.push("");
    lines.push("Errors:");
    validation.errors.forEach((e) => lines.push(`  ✖ ${e}`));
  }

  lines.push("");
  lines.push(validation.summary);

  // 6. Attach to Cohort
  try {
    const res = await zilaApi<{ success: boolean; message: string; cohort: any }>(
      `/cohorts/${targetCohortId}/github-repo`,
      {
        method: "PATCH",
        body: { githubRepoUrl: targetRepo },
      },
    );

    if (active && active.id === targetCohortId) {
      setActiveCohort({
        ...active,
        githubRepoUrl: targetRepo,
      });
    }

    lines.push("");
    lines.push(`✔ Repository linked successfully to cohort [${res.cohort?.name || targetCohortId}]`);
    lines.push(`All interns in this department and cohort can now automatically submit exercises to this repository.`);
  } catch (err: any) {
    lines.push("");
    lines.push(`Error saving cohort repository: ${err.message}`);
  }

  return lines.join("\n");
}

import type { ZilaCommand } from "./registry.js";

export const attachRepoCommand: ZilaCommand = {
  name: "attach-repo",
  aliases: ["link-repo", "cohort-repo", "supervisor-repo"],
  description: "Scan, validate and attach a curriculum repository to a cohort program (Supervisor only)",
  usage: "attach-repo <repoUrl> [--cohort <cohortId>] [--confirm]",
  category: "zask",
  available: true,
  handler: async (args, output) => {
    let repoUrl = "";
    let cohortId = "";
    let confirm = false;

    for (let i = 0; i < args.length; i++) {
      const current = args[i];
      if (!current) continue;
      if (current === "--cohort" && args[i + 1]) {
        cohortId = args[i + 1] ?? "";
        i++;
      } else if (current === "--confirm") {
        confirm = true;
      } else if (!current.startsWith("-") && !repoUrl) {
        repoUrl = current;
      }
    }

    output("Scanning and validating repository structure...", "info");
    const result = await executeAttachRepo(repoUrl, { cohortId, confirm });
    output(result, result.includes("✔") ? "success" : result.includes("⚠") ? "warning" : "default");
  },
};

