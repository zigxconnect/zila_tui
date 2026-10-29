import type { ZilaCommand } from "./registry.js";
import { API_BASE, loadAuth } from "../utils/auth.js";
import { loadGitHubAuth } from "../utils/githubAuth.js";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const API_BASE_URL = API_BASE.replace(/\/api$/, "");

function runGitCommand(args: string[], cwd: string, childEnv = process.env): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    const proc = spawn("git", args, { cwd, env: childEnv, shell: false });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({
        success: code === 0,
        output: stdout || stderr,
      });
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output: err.message,
      });
    });
  });
}

export const downloadsCommand: ZilaCommand = {
  name: "downloads",
  aliases: ["download", "zila-downloads", "clone-materials"],
  description: "Download and sync course materials & GitHub repository for your cohort",
  usage: "downloads [destination-dir]",
  category: "materials",
  available: true,
  handler: async (args, output) => {
    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("[AUTH] Not authenticated. Run 'zila auth' first.", "error");
      return;
    }

    try {
      output("[SYNC] Resolving course repository from your active cohort...", "info");

      const res = await fetch(`${API_BASE_URL}/api/github/active`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!res.ok) {
        output(`[ERROR] Could not resolve cohort repository (HTTP ${res.status})`, "error");
        return;
      }

      const data = await res.json() as any;
      const repoUrl = data.primaryRepoUrl;

      if (!repoUrl) {
        output("\n[NOTICE] No GitHub repository linked by your supervisor yet.", "warning");
        output("Your supervisor will link the course repository from their dashboard.\n", "dim");
        return;
      }

      const rawRepoName = repoUrl.split("/").pop()?.replace(/\.git$/, "") || "course-materials";
      const targetDir = args[0] || path.join(process.cwd(), rawRepoName);

      output("", "default");
      output("================================================================================", "info");
      output(`COHORT:      ${data.cohort?.name || 'Assigned Track'}`, "success");
      output(`REPOSITORY:  ${repoUrl}`, "info");
      output(`LOCAL PATH:  ${targetDir}`, "dim");
      output("================================================================================", "info");
      output("", "default");

      // Check if target directory already exists
      if (fs.existsSync(targetDir) && fs.existsSync(path.join(targetDir, ".git"))) {
        output(`[PULL] Existing repository detected. Pulling latest course updates...`, "info");
        const pullRes = await runGitCommand(["pull"], targetDir);
        if (pullRes.success) {
          output(`[SUCCESS] Repository updated successfully!`, "success");
          output(pullRes.output.trim() || "Already up to date.", "dim");
        } else {
          output(`[WARNING] Git pull completed with notice: ${pullRes.output.trim()}`, "warning");
        }
      } else {
        output(`[CLONE] Cloning repository to ${targetDir}...`, "info");

        // Format authenticated URL if user is GitHub authenticated
        const ghAuth = loadGitHubAuth();
        const parsedRepoUrl = new URL(repoUrl);
        if (parsedRepoUrl.protocol !== "https:" || parsedRepoUrl.username || parsedRepoUrl.password) {
          throw new Error("Course repository URL must be an HTTPS URL without embedded credentials.");
        }
        const cloneEnv = { ...process.env };
        if (ghAuth?.token && parsedRepoUrl.hostname.toLowerCase() === "github.com") {
          cloneEnv.GIT_CONFIG_COUNT = "1";
          cloneEnv.GIT_CONFIG_KEY_0 = "http.https://github.com/.extraheader";
          cloneEnv.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${ghAuth.token}`).toString("base64")}`;
        }

        const parentDir = path.dirname(targetDir);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        const cloneRes = await runGitCommand(["clone", repoUrl, targetDir], parentDir, cloneEnv);
        if (cloneRes.success) {
          output(`[SUCCESS] Cloned course materials into: ${targetDir}`, "success");
        } else {
          output(`[ERROR] Git clone failed: ${cloneRes.output.trim()}`, "error");
          output("[TIP] Verify your git configuration or run 'zila gh-auth' to connect your GitHub account.", "dim");
          return;
        }
      }

      output("", "default");
      output("COLLABORATION & PR SUBMISSION WORKFLOW:", "info");
      output("─".repeat(72), "dim");
      output(` 1. Navigate:     cd ${rawRepoName}`, "default");
      output(` 2. Folder:       contributors/<username>/<level>/<module>/day-<day>/exercise.md`, "default");
      output(` 3. Automated PR: Run 'submit-task' or 'zila-submit' to open background PR`, "default");
      output(` 4. Quota:        1 PR a day recommended (Max 2 PRs per calendar day)`, "default");
      output(` 5. Rubric Scale: Day 1 (12.5%) · Day 2 (12.5%) · Day 3 (25%) · Day 4 (50%)`, "default");
      output("─".repeat(72), "dim");
      output("[READY] You are set up to build and collaborate with your fellow interns!", "success");
      output("", "default");

    } catch (error: any) {
      output(`[ERROR] Failed to download course materials: ${error.message}`, "error");
    }
  },
};
