import fs from "node:fs";
import path from "node:path";
import type { ZilaCommand } from "./registry.js";
import { loadWorkspace, getLogbookDir } from "../utils/workspace.js";
import {
  readEventsInRange,
  getWeekRange,
  getCurrentWeekNumber,
  type CommitEvent,
  type FileEvent,
} from "../utils/monitor.js";
import { zilaApi } from "../utils/auth.js";

// Profile helper

interface ZigexProfile {
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

async function fetchStudentName(fallback: string): Promise<string> {
  try {
    // The API returns { profile: { full_name, first_name, last_name, ... } }
    const data = await zilaApi<{ profile?: ZigexProfile }>("/auth/profile");
    const p = data.profile;
    if (!p) return fallback;

    if (p.full_name?.trim()) return p.full_name.trim();

    const composed = [p.first_name, p.last_name]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" ");
    if (composed) return composed;
  } catch {
    // API unreachable, token expired
  }
  return fallback;
}

// Formatting helpers

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function shortDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function groupByDay<T extends { ts: string }>(events: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const ev of events) {
    const day = shortDate(new Date(ev.ts));
    const existing = map.get(day) ?? [];
    existing.push(ev);
    map.set(day, existing);
  }
  return map;
}

function estimateTime(fileEvents: FileEvent[]): string {
  if (fileEvents.length < 2) return "< 5 min";
  const times = fileEvents
    .map((e) => new Date(e.ts).getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);
  if (times.length < 2) return "< 5 min";
  const mins = Math.round((times[times.length - 1]! - times[0]!) / 60_000);
  if (mins < 5) return "< 5 min";
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `~${h}h ${m}min` : `~${h}h`;
}

// Skill inference

const SKILL_KEYWORDS = new Map([
  ["html", "HTML"],
  ["css", "CSS"],
  ["flex", "Flexbox"],
  ["grid", "CSS Grid"],
  ["js", "JavaScript"],
  ["ts", "TypeScript"],
  ["react", "React"],
  ["api", "API"],
  ["auth", "Authentication"],
  ["git", "Git workflow"],
  ["test", "Testing"],
  ["python", "Python"],
  ["ml", "Machine Learning"],
  ["model", "ML Models"],
  ["data", "Data handling"],
]);

function extractSkillsFromCommits(commits: CommitEvent[]): string[] {
  const found = new Set<string>();
  for (const c of commits) {
    const lower = c.msg.toLowerCase();
    for (const [kw, label] of SKILL_KEYWORDS) {
      if (lower.includes(kw)) found.add(label);
    }
  }
  return [...found];
}

// Core generator

async function generateLogbook(
  workspacePath: string,
  department: string,
  level: string,
  studentName: string,
  weekNumber: number,
  createdAt: string,
): Promise<string> {
  const { from, to } = getWeekRange(weekNumber, createdAt);
  const events = readEventsInRange(workspacePath, from, to);

  const commits = events.filter((e): e is CommitEvent => e.type === "commit");
  const files = events.filter((e): e is FileEvent => e.type !== "commit");

  // Attempt to refresh the name from the API; fall back to whatever was saved
  const resolvedName = await fetchStudentName(studentName);

  const commitsByDay = groupByDay(commits);
  const filesByDay = groupByDay(files);

  const capitalize = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1);

  const lines: string[] = [
    `# Internship Logbook — Week ${weekNumber}`,
    `**Student:** ${resolvedName}`,
    `**Department:** ${capitalize(department)}`,
    `**Level:** ${capitalize(level)}`,
    `**Period:** ${shortDate(from)} to ${shortDate(to)}`,
    `**Generated:** ${new Date().toISOString()}`,
    "",
    "---",
    "",
  ];

  const dayRange: string[] = [];
  for (let d = 0; d < 7; d++) {
    const day = new Date(from);
    day.setDate(from.getDate() + d);
    dayRange.push(shortDate(day));
  }

  let hasAnyActivity = false;

  for (const day of dayRange) {
    const dayCommits = commitsByDay.get(day) ?? [];
    const dayFiles = filesByDay.get(day) ?? [];

    if (dayCommits.length === 0 && dayFiles.length === 0) continue;
    hasAnyActivity = true;

    // Use noon so timezone shifts don't flip the date
    const dayDate = new Date(day + "T12:00:00");
    lines.push(`## ${formatDate(dayDate)}`);
    lines.push("");

    if (dayCommits.length > 0) {
      lines.push("**Commits:**");
      for (const c of dayCommits) {
        lines.push(`- \`${c.hash.slice(0, 7)}\` ${c.msg}`);
        if (c.diff_stat) {
          const statLines = c.diff_stat.split("\n").filter(Boolean).slice(0, 3);
          for (const s of statLines) lines.push(`  ${s.trim()}`);
        }
      }
      lines.push("");
    }

    if (dayFiles.length > 0) {
      const est = estimateTime(dayFiles);
      lines.push(
        `**Activity:** ${dayFiles.length} file event${dayFiles.length !== 1 ? "s" : ""} — estimated time: ${est}`,
      );
      const uniqueFiles = [...new Set(dayFiles.map((f) => f.path))].slice(0, 10);
      for (const f of uniqueFiles) lines.push(`- ${f}`);
      lines.push("");
    }
  }

  if (!hasAnyActivity) {
    lines.push("_No activity recorded this week._");
    lines.push("");
    lines.push(
      "> If you worked this week, make sure to run  zila monitor start  before starting.",
    );
    lines.push("");
  }

  // Summary
  const uniqueSkills = extractSkillsFromCommits(commits);
  lines.push("---");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total commits this week:** ${commits.length}`);
  lines.push(`- **Files touched:** ${new Set(files.map((f) => f.path)).size}`);
  if (uniqueSkills.length > 0) {
    lines.push(`- **Topics/skills inferred:** ${uniqueSkills.join(", ")}`);
  }
  lines.push(
    `- **Monitor active:** ${files.length > 0 ? "Yes" : "No (no file events recorded)"}`,
  );
  lines.push("");

  return lines.join("\n");
}

// Command

export const logbookCommand: ZilaCommand = {
  name: "logbook",
  aliases: ["log"],
  description: "Generate your weekly internship logbook",
  usage: "logbook [--week N]",
  category: "workflow",
  available: true,

  handler: async (args, output) => {
    const ws = await loadWorkspace();
    if (!ws) {
      output("No workspace found. Run  zila init  first.", "error");
      return;
    }

    // Parse --week flag
    let weekNumber: number | null = null;
    const weekFlagIdx = args.indexOf("--week");
    if (weekFlagIdx !== -1) {
      const val = parseInt(args[weekFlagIdx + 1] ?? "", 10);
      if (isNaN(val) || val < 1) {
        output("Invalid week number. Usage:  logbook --week 3", "error");
        return;
      }
      weekNumber = val;
    }

    const currentWeek = getCurrentWeekNumber(ws.createdAt);
    const targetWeek = weekNumber ?? currentWeek;

    output(`Generating logbook for week ${targetWeek}…`, "dim");

    let content: string;
    try {
      content = await generateLogbook(
        ws.workspacePath,
        ws.department,   
        ws.level,        
        ws.studentName,  
        targetWeek,
        ws.createdAt,
      );
    } catch (e) {
      output(
        `Failed to generate logbook: ${e instanceof Error ? e.message : String(e)}`,
        "error",
      );
      return;
    }

    // Save to .zila/logbooks/week-NN.md
    const dir = getLogbookDir(ws.workspacePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `week-${String(targetWeek).padStart(2, "0")}.md`;
    const outPath = path.join(dir, filename);
    fs.writeFileSync(outPath, content, "utf-8");

    output(`Logbook saved:  ${outPath}`, "success");
    output(
      `Week ${targetWeek} · ${content.split("\n").filter((l) => l.startsWith("- `")).length} commits recorded`,
      "dim",
    );

    if (targetWeek === currentWeek) {
      output("Tip: run  logbook --week N  to generate a past week.", "dim");
    }
  },
};