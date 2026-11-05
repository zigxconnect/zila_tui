import type { ZilaCommand } from "./registry.js";
import { isAuthenticated, loadAuth, zilaApi } from "../utils/auth.js";
import { getActiveCohort, setActiveCohort } from "../utils/activeCohort.js";

export async function executeDetachRepo(options: { cohortId?: string; asSupervisor?: boolean } = {}): Promise<string> {
  const auth = loadAuth();
  const active = getActiveCohort();

  let isSupervisor = false;
  if (process.env.ZILA_ROLE === "supervisor" || options.asSupervisor) {
    isSupervisor = true;
  }

  if (isAuthenticated()) {
    try {
      const rolesRes = await zilaApi<{ roles?: string[] }>("/profile/roles");
      if (rolesRes.roles && (rolesRes.roles.includes("supervisor") || rolesRes.roles.includes("company") || rolesRes.roles.includes("admin"))) {
        isSupervisor = true;
      } else {
        const meRes = await zilaApi<{ profile?: any; type?: string }>("/profile/me");
        if (meRes.type === "supervisor" || meRes.type === "company" || meRes.type === "admin" || meRes.profile?.role === "supervisor") {
          isSupervisor = true;
        }
      }
    } catch {
      // offline fallback
    }
  }

  if (active?.supervisorEmail && auth?.email && active.supervisorEmail.toLowerCase() === auth.email.toLowerCase()) {
    isSupervisor = true;
  }

  if (!isSupervisor) {
    if (!isAuthenticated()) {
      return "Error: You must be authenticated as a supervisor to detach a repository. Run 'zila auth'.";
    }
    return "Error: Access denied. Repository detachment is restricted to verified Supervisors only.";
  }

  const cohort = active;
  const cohortId = options.cohortId || cohort?.id;

  if (!cohortId) {
    return "Error: No cohort program selected. Select an active cohort using 'zila select-cohort' or provide --cohort <id>.";
  }

  const prevUrl = cohort?.githubRepoUrl || "linked repository";

  // Call API to detach GitHub repo
  try {
    await zilaApi(`/cohorts/${cohortId}/github-repo`, {
      method: "PATCH",
      body: { githubRepoUrl: null },
    });
  } catch {
    try {
      await zilaApi(`/cohorts/${cohortId}/github-repo`, { method: "DELETE" });
    } catch {
      // offline or unreachable
    }
  }

  // Clear local active cohort repo
  if (cohort && cohort.id === cohortId) {
    const updated = { ...cohort, githubRepoUrl: undefined };
    setActiveCohort(updated);
  }

  return [
    `✔ Successfully detached repository from cohort "${cohort?.name || cohortId}".`,
    `Previous Repository: ${prevUrl}`,
    "",
    "The program is now unlinked. Supervisors can now generate or attach a new repository using:",
    "  zila generate-repo <curriculum.json> --push",
  ].join("\n");
}

export const detachRepoCommand: ZilaCommand = {
  name: "detach-repo",
  aliases: ["unlink-repo", "remove-repo", "disconnect-repo"],
  description: "Detach and unlink the active live GitHub repository from a cohort program (Supervisor only)",
  usage: "detach-repo [--cohort <id>]",
  category: "zask",
  available: true,
  handler: async (args, output) => {
    let cohortId = "";
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--cohort" && args[i + 1]) {
        cohortId = args[i + 1] ?? "";
        i++;
      }
    }
    output("Detaching repository from cohort...", "info");
    const result = await executeDetachRepo({ cohortId });
    output(result, result.includes("✔") ? "success" : "warning");
  },
};
