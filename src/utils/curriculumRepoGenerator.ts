import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { loadGitHubAuth } from "./githubAuth.js";
import { zilaApi } from "./auth.js";
import { getActiveCohort, setActiveCohort } from "./activeCohort.js";

export interface CurriculumFunction {
  name: string;
  args?: string;
  doc?: string;
  returns?: string;
}

export interface CurriculumDay {
  task: string;
  objective: string;
  tasks: string[];
  requirements: string[];
  gradingWeight: number;
  criteriaNotes: string;
  language?: string;
  starterFile?: string;
  functions?: CurriculumFunction[];
  files?: Record<string, string>;
}

export interface CurriculumModule {
  title: string;
  dir?: string;
  days: CurriculumDay[];
  sharedFiles?: Record<string, string>;
}

export interface CurriculumTrack {
  name: string;
  modules: CurriculumModule[];
}

export interface CurriculumSpec {
  organization: string;
  cohort: string;
  domain: string;
  starterLanguage?: string;
  repoName?: string;
  tracks: CurriculumTrack[];
}

export const EXERCISE_TEMPLATE = `# Day {{DAY}} Exercise: {{MODULE}}

**Intern:** {{GITHUB_USERNAME}}   **Date:** {{DATE}}

## 1. Summary
{{SUMMARY}}

## 2. Answers / Implementation
_Theory: your answers. Practical: detailed description, steps, code snippets and results._

## 3. Challenges
{{CHALLENGES}}

## 4. Links
- Project repo: {{REPO}}
- Deployment (if applicable): {{DEPLOY}}
`;

export const GITIGNORE_CONTENT = `node_modules/
dist/
build/
coverage/
__pycache__/
*.pyc
.venv/
venv/
.ipynb_checkpoints/
.env
.DS_Store
*.log
`;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "item";
}

function prettify(text: string): string {
  return text
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderPythonStub(funcs: CurriculumFunction[], task: string): string {
  const lines: string[] = [`"""Starter file: ${task}"""`, "", ""];
  for (const fn of funcs) {
    const name = fn.name;
    const args = fn.args || "";
    const doc = fn.doc || "TODO: describe.";
    const ret = fn.returns ? ` -> ${fn.returns}` : "";
    lines.push(
      `def ${name}(${args})${ret}:`,
      `    """${doc}"""`,
      `    # TODO: implement`,
      `    raise NotImplementedError`,
      "",
    );
  }
  lines.push('if __name__ == "__main__":', "    # TODO: call your functions to demonstrate results", "    pass", "");
  return lines.join("\n");
}

function renderJavaScriptStub(funcs: CurriculumFunction[], task: string): string {
  const lines: string[] = [`// Starter file: ${task}`, ""];
  for (const fn of funcs) {
    lines.push(
      "/**",
      ` * ${fn.doc || "TODO: describe."}`,
      " */",
      `function ${fn.name}(${fn.args || ""}) {`,
      "  // TODO: implement",
      "  throw new Error('Not implemented');",
      "}",
      "",
    );
  }
  lines.push(`module.exports = { ${funcs.map((f) => f.name).join(", ")} };\n`);
  return lines.join("\n");
}

function renderTypeScriptStub(funcs: CurriculumFunction[], task: string): string {
  const lines: string[] = [`// Starter file: ${task}`, ""];
  for (const fn of funcs) {
    const r = fn.returns ? `: ${fn.returns}` : "";
    lines.push(
      "/**",
      ` * ${fn.doc || "TODO: describe."}`,
      " */",
      `export function ${fn.name}(${fn.args || ""})${r} {`,
      "  // TODO: implement",
      "  throw new Error('Not implemented');",
      "}",
      "",
    );
  }
  return lines.join("\n");
}

function renderMarkdownStub(funcs: CurriculumFunction[], task: string): string {
  const lines: string[] = [`# ${task}`, "", "_Non-code worksheet: complete each section._", ""];
  for (const fn of funcs) {
    lines.push(`## ${fn.name}`, `${fn.doc || "TODO: describe."}`, "", "_Your answer:_", "", "");
  }
  return lines.join("\n");
}

export function renderStarterCode(
  lang: string,
  funcs: CurriculumFunction[],
  task: string,
): { filename: string; content: string } {
  const cleanLang = lang.toLowerCase();
  if (cleanLang === "javascript" || cleanLang === "js") {
    return { filename: "solution.js", content: renderJavaScriptStub(funcs, task) };
  } else if (cleanLang === "typescript" || cleanLang === "ts") {
    return { filename: "solution.ts", content: renderTypeScriptStub(funcs, task) };
  } else if (cleanLang === "markdown" || cleanLang === "md") {
    return { filename: "worksheet.md", content: renderMarkdownStub(funcs, task) };
  } else {
    // Default to Python
    return { filename: "solution.py", content: renderPythonStub(funcs, task) };
  }
}

export function validateCurriculumSpec(spec: CurriculumSpec): string[] {
  const errors: string[] = [];
  if (!spec.organization) errors.push("Missing 'organization'");
  if (!spec.cohort) errors.push("Missing 'cohort'");
  if (!spec.domain) errors.push("Missing 'domain'");
  if (!Array.isArray(spec.tracks) || spec.tracks.length === 0) {
    errors.push("Missing 'tracks' array");
    return errors;
  }

  const trackNames = spec.tracks.map((t) => t.name.toLowerCase());
  for (const req of ["beginner", "intermediate", "advanced"]) {
    if (!trackNames.includes(req)) {
      errors.push(`Missing required track: '${req}'`);
    }
  }

  for (const track of spec.tracks) {
    if (!track.modules || track.modules.length === 0) {
      errors.push(`Track '${track.name}' has no modules`);
      continue;
    }
    for (let mi = 0; mi < track.modules.length; mi++) {
      const mod = track.modules[mi];
      if (!mod || !mod.days || mod.days.length === 0) {
        errors.push(`Module '${mod?.title || mi + 1}' in track '${track.name}' has no days`);
        continue;
      }
      for (let di = 0; di < mod.days.length; di++) {
        const day = mod.days[di];
        if (!day) continue;
        if (!day.task) errors.push(`Track '${track.name}' / '${mod.title}' Day ${di + 1}: missing 'task'`);
        if (!day.objective) errors.push(`Track '${track.name}' / '${mod.title}' Day ${di + 1}: missing 'objective'`);
      }
    }
  }

  return errors;
}

export function generateLocalCurriculumRepo(
  spec: CurriculumSpec,
  outputDir: string,
  options: { supervisorFileName?: string; prefillExercise?: boolean } = {},
): { totalDays: number; outputPath: string } {
  const supervisorFileName = options.supervisorFileName || ".supervisor_instructions";
  const root = path.resolve(outputDir);
  fs.mkdirSync(root, { recursive: true });

  // 1. Root files
  const trackRows: string[] = [];
  for (const t of spec.tracks) {
    const titles = t.modules.map((m) => m.title).join(", ");
    trackRows.push(`| \`${t.name}/\` | ${titles} |`);
  }

  const rootReadme = [
    `# ${spec.organization} - ${spec.domain} Curriculum`,
    "",
    `**Cohort:** ${spec.cohort}`,
    "",
    "A Zila Cohort Prototype curriculum repository.",
    "",
    "| Track | Modules |",
    "| --- | --- |",
    ...trackRows,
    "",
    "## Daily Workflow",
    "1. Navigate to your track and day: `<track>/<module>/day_N/README.md`.",
    "2. Implement the starter files in that directory.",
    "3. Copy `templates/exercise.md` into the day folder and complete your progress report.",
    "4. Submit using `zila-submit` from your terminal.",
    "",
    "All interns work in isolated directories under `contributors/<username>/`.",
  ].join("\n");

  fs.writeFileSync(path.join(root, "README.md"), rootReadme, "utf-8");
  fs.writeFileSync(path.join(root, ".gitignore"), GITIGNORE_CONTENT, "utf-8");
  fs.writeFileSync(
    path.join(root, "cohort.json"),
    JSON.stringify(
      {
        organization: spec.organization,
        cohort: spec.cohort,
        domain: spec.domain,
        standard: "zila-cohort-prototype",
        tracks: spec.tracks.map((t) => t.name),
      },
      null,
      2,
    ),
    "utf-8",
  );

  const templatesDir = path.join(root, "templates");
  fs.mkdirSync(templatesDir, { recursive: true });
  fs.writeFileSync(path.join(templatesDir, "exercise.md"), EXERCISE_TEMPLATE, "utf-8");

  const contribDir = path.join(root, "contributors");
  fs.mkdirSync(contribDir, { recursive: true });
  fs.writeFileSync(path.join(contribDir, ".gitkeep"), "", "utf-8");

  // 2. Tracks > Modules > Days
  let totalDays = 0;
  const defaultLang = spec.starterLanguage || "python";

  for (const track of spec.tracks) {
    for (let mi = 0; mi < track.modules.length; mi++) {
      const mod = track.modules[mi];
      if (!mod) continue;
      const modDirName = mod.dir || `${mi + 1}_${slugify(mod.title)}`;
      const modPath = path.join(root, track.name, modDirName);
      fs.mkdirSync(modPath, { recursive: true });

      if (mod.sharedFiles) {
        for (const [fname, content] of Object.entries(mod.sharedFiles)) {
          fs.writeFileSync(path.join(modPath, fname), content, "utf-8");
        }
      }

      for (let di = 0; di < mod.days.length; di++) {
        const day = mod.days[di];
        if (!day) continue;
        const dayN = di + 1;
        const dayPath = path.join(modPath, `day_${dayN}`);
        fs.mkdirSync(dayPath, { recursive: true });

        // README.md
        const taskList = (day.tasks || []).map((t, idx) => `${idx + 1}. ${t}`).join("\n");
        const dayReadme = [
          `# ${prettify(track.name)} / ${mod.title} / Day ${dayN}`,
          "",
          `## Objective`,
          day.objective || "Complete daily practical task.",
          "",
          `## Tasks`,
          taskList || "1. Complete day exercises.",
          "",
          `## Deliverable`,
          "Copy `templates/exercise.md` into this folder, complete all sections, and run `zila-submit`.",
        ].join("\n");
        fs.writeFileSync(path.join(dayPath, "README.md"), dayReadme, "utf-8");

        // Starter Code
        const lang = day.language || defaultLang;
        const funcs = day.functions || [{ name: "solution", doc: `Implement: ${day.task}` }];
        if (day.files && Object.keys(day.files).length > 0) {
          for (const [fName, content] of Object.entries(day.files)) {
            fs.writeFileSync(path.join(dayPath, fName), content, "utf-8");
          }
        } else {
          const starter = renderStarterCode(lang, funcs, day.task);
          const fname = day.starterFile || starter.filename;
          fs.writeFileSync(path.join(dayPath, fname), starter.content, "utf-8");
        }

        // Hidden Supervisor Instructions
        const supervisorData = {
          task: day.task,
          requirements: day.requirements || [],
          gradingWeight: day.gradingWeight || 1.0,
          criteriaNotes: day.criteriaNotes || "Check for incremental commits and anti-cheating signals.",
        };
        fs.writeFileSync(
          path.join(dayPath, supervisorFileName),
          JSON.stringify(supervisorData, null, 2),
          "utf-8",
        );

        if (options.prefillExercise) {
          const prefilled = EXERCISE_TEMPLATE.replace("{{DAY}}", String(dayN)).replace(
            "{{MODULE}}",
            mod.title,
          );
          fs.writeFileSync(path.join(dayPath, "exercise.md"), prefilled, "utf-8");
        }

        totalDays++;
      }
    }
  }

  return { totalDays, outputPath: root };
}

/**
 * Creates a public GitHub repository under the Zigex organization (or user),
 * initializes Git, pushes the generated curriculum, and binds it to the active cohort.
 */
export async function publishCurriculumToGitHub(
  localRepoPath: string,
  spec: CurriculumSpec,
  options: { org?: string; cohortId?: string } = {},
): Promise<{ repoUrl: string; attachedCohortId?: string }> {
  const ghAuth = loadGitHubAuth();
  const token = ghAuth?.token || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GitHub authentication required. Run 'zila github-auth' first.");
  }

  const orgName = options.org || "zigxconnect";
  const repoName = spec.repoName || `${slugify(spec.organization)}_${slugify(spec.domain)}`;

  const headers = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `token ${token}`,
    "User-Agent": "Zila-Curriculum-Publisher",
  };

  let repoUrl = "";
  // 1. Try creating as public in organization
  let createRes = await fetch(`https://api.github.com/orgs/${orgName}/repos`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: repoName,
      description: `${spec.organization} ${spec.domain} Curriculum (${spec.cohort})`,
      private: false, // PUBLIC REPO
      has_issues: true,
      has_projects: true,
      has_wiki: false,
    }),
  });

  if (createRes.ok) {
    const data: any = await createRes.json();
    repoUrl = data.clone_url || data.html_url;
  } else {
    // If organization access fails, fall back to user's public repo
    createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: repoName,
        description: `${spec.organization} ${spec.domain} Curriculum (${spec.cohort})`,
        private: false, // PUBLIC REPO
      }),
    });
    if (createRes.ok) {
      const data: any = await createRes.json();
      repoUrl = data.clone_url || data.html_url;
    } else {
      const errData: any = await createRes.json().catch(() => ({}));
      throw new Error(`Failed to create GitHub repository: ${errData.message || createRes.statusText}`);
    }
  }

  // 2. Initialize git and push
  try {
    execSync(`git init -b main`, { cwd: localRepoPath, stdio: "pipe" });
    execSync(`git config user.name "Zila Curriculum Automation"`, { cwd: localRepoPath, stdio: "pipe" });
    execSync(`git config user.email "bot@zigexconnect.com"`, { cwd: localRepoPath, stdio: "pipe" });
    execSync(`git add .`, { cwd: localRepoPath, stdio: "pipe" });
    execSync(`git commit -m "feat(curriculum): initialize Zila prototype repository for ${spec.cohort}"`, {
      cwd: localRepoPath,
      stdio: "pipe",
    });

    const authedUrl = repoUrl.replace("https://", `https://${token}@`);
    execSync(`git remote add origin ${authedUrl}`, { cwd: localRepoPath, stdio: "pipe" });
    execSync(`git push -u origin main`, { cwd: localRepoPath, stdio: "pipe" });
  } catch (gitErr: any) {
    throw new Error(`Git initialization or push failed: ${gitErr.message}`);
  }

  // 3. Attach to cohort on Zila API
  let targetCohortId = options.cohortId;
  const active = getActiveCohort();
  if (!targetCohortId && active?.id) {
    targetCohortId = active.id;
  }

  if (targetCohortId) {
    try {
      await zilaApi(`/cohorts/${targetCohortId}/github-repo`, {
        method: "PATCH",
        body: { githubRepoUrl: repoUrl },
      });
      if (active && active.id === targetCohortId) {
        setActiveCohort({ ...active, githubRepoUrl: repoUrl });
      }
    } catch {
      // Non-fatal if offline
    }
  }

  return { repoUrl, attachedCohortId: targetCohortId };
}
