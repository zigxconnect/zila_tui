import { ZilaCommand, ShellContext, OutputCallback } from "./registry.js";
import {
  getActiveCohort,
  setActiveCohort,
  clearActiveCohort,
} from "../utils/activeCohort.js";
import { fetchCohortOptions, CohortOption } from "../screens/CohortPickerScreen.js";
import { theme } from "../ui/theme.js";

export const selectCohortCommand: ZilaCommand = {
  name: "select",
  description: "Navigate into a cohort context (select --cohorts, select <id>, select --clear)",
  usage: "select [--cohorts | <id> | --current | --clear]",
  category: "cohort",
  aliases: ["select-cohort", "use-cohort", "use"],
  available: true,
  handler: async (args: string[], output: OutputCallback, context?: ShellContext) => {
    const isInteractive = Boolean(context?.startCohortPicker);
    const sub = args[0]?.toLowerCase();

    // 1. Clear active cohort
    if (sub === "--clear" || sub === "clear" || sub === "--reset") {
      const current = getActiveCohort();
      clearActiveCohort();
      output("Active cohort context cleared.", "warning");
      output("Prompt reset to default: lil-zila ›", "dim");
      return;
    }

    // 2. View current active cohort
    if (sub === "--current" || sub === "current" || sub === "--status") {
      const current = getActiveCohort();
      if (!current) {
        output("No cohort currently active. Type 'select --cohorts' to choose one.", "warning");
        return;
      }
      output(`────────────────────────────────────────────────────────────────────────`, "dim");
      output(`lil-zila › active cohort context`, "default");
      output(`────────────────────────────────────────────────────────────────────────`, "dim");
      output(`Cohort:          ${current.name}`, "success");
      output(`Prompt Slug:     ${current.slug} (lil-zila/${current.slug} ›)`, "default");
      output(`Domain:          ${current.domainKey.toUpperCase()}`, "default");
      output(`Track Level:     ${current.level.toUpperCase()}`, "default");
      output(`Supervisor:      ${current.supervisorName || "Assigned Supervisor"}`, "dim");
      output(`GitHub Repo:     ${current.githubRepoUrl || "https://github.com/iws3/sample_repo_zila.git (Standard)"}`, "dim");
      output(`Activated:       ${new Date(current.selectedAt).toLocaleTimeString()}`, "dim");
      output(`────────────────────────────────────────────────────────────────────────`, "dim");
      output(`All tasks submitted will automatically use this cohort's settings.`, "dim");
      return;
    }

    // 3. Direct cohort ID or keyword switch
    if (sub && sub !== "--cohorts" && sub !== "-c" && !sub.startsWith("-")) {
      try {
        const cohorts = await fetchCohortOptions();
        const matched = cohorts.find(
          (c) =>
            c.id.toLowerCase() === sub ||
            c.name.toLowerCase().includes(sub) ||
            (c.department && c.department.toLowerCase().includes(sub))
        );

        if (!matched) {
          output(`No enrolled cohort matching "${sub}" was found.`, "error");
          output("Run 'select --cohorts' to pick from your enrolled list.", "dim");
          return;
        }

        const activated = setActiveCohort({
          id: matched.id,
          name: matched.name,
          department: matched.department,
          level: (matched as any).level || "intermediate",
          supervisorName: matched.supervisorName,
          supervisorEmail: (matched as any).supervisorEmail,
          githubRepoUrl: (matched as any).githubRepoUrl,
        });

        output(`Entered cohort context: ${activated.name}`, "success");
        output(`Prompt updated: lil-zila/${activated.slug} ›`, "default");
        output(`Target domain: [${activated.domainKey.toUpperCase()}], Level: [${activated.level.toUpperCase()}]`, "dim");
        return;
      } catch (err: any) {
        output(`Failed to switch cohort: ${err.message || String(err)}`, "error");
        return;
      }
    }

    // 4. Interactive picker mode
    if (context?.startCohortPicker) {
      context.startCohortPicker("select" as any);
      return;
    }

    // 5. Headless list mode
    try {
      const cohorts = await fetchCohortOptions();
      if (cohorts.length === 0) {
        output("No enrolled cohorts found for your account.", "warning");
        return;
      }

      const active = getActiveCohort();
      output(`────────────────────────────────────────────────────────────────────────`, "dim");
      output(`Your Enrolled Cohorts (${cohorts.length}):`, "default");
      output(`────────────────────────────────────────────────────────────────────────`, "dim");

      cohorts.forEach((c, i) => {
        const isActive = active?.id === c.id;
        const mark = isActive ? "★ [ACTIVE]" : `  [${i + 1}]`;
        output(`${mark} ${c.name} (${c.department || "General"})`, isActive ? "success" : "default");
        output(`      ID: ${c.id} · Level: ${(c as any).level || "intermediate"} · Supervisor: ${c.supervisorName || "—"}`, "dim");
      });

      output(`────────────────────────────────────────────────────────────────────────`, "dim");
      output(`Use 'select <id>' to switch into that cohort.`, "dim");
    } catch (err: any) {
      output(`Unable to load cohorts: ${err.message || String(err)}`, "error");
    }
  },
};
