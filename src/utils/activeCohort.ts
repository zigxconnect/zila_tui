import fs from "fs";
import path from "path";
import os from "os";

export interface ActiveCohort {
  id: string;
  name: string;
  slug: string;
  department?: string;
  domainKey: string; // "ml" | "web" | "cyber" | "embeded" | "app" | "cloud"
  level: "beginner" | "intermediate" | "advanced";
  supervisorName?: string;
  supervisorEmail?: string;
  githubRepoUrl?: string;
  selectedAt: string;
}

export function getZilaDir(): string {
  if (process.env.ZILA_CONFIG_DIR) {
    if (!fs.existsSync(process.env.ZILA_CONFIG_DIR)) {
      fs.mkdirSync(process.env.ZILA_CONFIG_DIR, { recursive: true });
    }
    return process.env.ZILA_CONFIG_DIR;
  }
  const defaultDir = path.join(os.homedir(), ".zila");
  try {
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    return defaultDir;
  } catch {
    const fallbackDir = path.join(process.cwd(), ".zila");
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
}

export function getActiveCohortFile(): string {
  return path.join(getZilaDir(), "active_cohort.json");
}

/**
 * Ensures zila directory exists
 */
function ensureZilaDir(): string {
  return getZilaDir();
}

/**
 * Generate a clean, concise slug for terminal prompt display
 * e.g. "Summer 2024 - Web Development" -> "web-development"
 * e.g. "Ai/Machine Learning" -> "ai-ml"
 */
export function generateCohortSlug(name: string, dept?: string): string {
  const source = (dept && dept.toLowerCase() !== "general") ? dept : name;
  let clean = source
    .toLowerCase()
    .replace(/summer|winter|fall|spring|\d{4}/gi, "")
    .replace(/bootcamp|internship|program|cohort/gi, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();

  if (!clean || clean.length < 2) {
    clean = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 16);
  }

  // Common concise abbreviations
  if (clean === "ml" || clean.includes("machine-learning") || clean.includes("ai")) return "ai-ml";
  if (clean === "web" || clean.includes("web")) return "web-dev";
  if (clean === "cyber" || clean.includes("cyber")) return "cyber";
  if (clean === "embedded" || clean.includes("iot")) return "embedded";
  if (clean === "app" || clean.includes("mobile")) return "mobile-app";
  if (clean === "cloud" || clean.includes("devops")) return "cloud";

  return clean.slice(0, 18) || "cohort";
}

/**
 * Maps cohort title and department to supported curriculum domain
 */
export function mapDepartmentToDomain(dept?: string, title?: string): string {
  const combined = `${dept || ""} ${title || ""}`.toLowerCase();
  if (
    combined.includes("mobile") ||
    combined.includes("react native") ||
    combined.includes("react-native") ||
    combined.includes("flutter") ||
    combined.includes("ios") ||
    combined.includes("android") ||
    dept?.toLowerCase() === "app"
  ) {
    return "app";
  }
  if (
    combined.includes("web") ||
    combined.includes("frontend") ||
    combined.includes("react") ||
    combined.includes("node") ||
    combined.includes("fullstack")
  ) {
    return "web";
  }
  if (combined.includes("cyber") || combined.includes("security") || combined.includes("pentest")) {
    return "cyber";
  }
  if (combined.includes("embedded") || combined.includes("hardware") || combined.includes("iot") || combined.includes("rtos")) {
    return "embeded";
  }
  if (combined.includes("cloud") || combined.includes("devops") || combined.includes("aws") || combined.includes("kubernetes")) {
    return "cloud";
  }
  return "ml";
}

/**
 * Normalizes level string to beginner | intermediate | advanced
 */
export function mapLevel(level?: string, title?: string): "beginner" | "intermediate" | "advanced" {
  const combined = `${level || ""} ${title || ""}`.toLowerCase();
  if (combined.includes("advance")) return "advanced";
  if (combined.includes("beginner") || combined.includes("basic") || combined.includes("intro")) return "beginner";
  return "intermediate";
}

/**
 * Retrieve current active cohort from local persistent storage
 */
export function getActiveCohort(): ActiveCohort | null {
  try {
    if (!fs.existsSync(getActiveCohortFile())) {
      return null;
    }
    const raw = fs.readFileSync(getActiveCohortFile(), "utf8");
    const data = JSON.parse(raw);
    if (!data || !data.id || !data.name) {
      return null;
    }
    return data as ActiveCohort;
  } catch {
    return null;
  }
}

/**
 * Set and persist active cohort
 */
export function setActiveCohort(cohort: {
  id: string;
  name: string;
  department?: string;
  level?: string;
  supervisorName?: string;
  supervisorEmail?: string;
  githubRepoUrl?: string;
}): ActiveCohort {
  ensureZilaDir();

  const domainKey = mapDepartmentToDomain(cohort.department, cohort.name);
  const normalizedLevel = mapLevel(cohort.level, cohort.name);
  const slug = generateCohortSlug(cohort.name, cohort.department);

  const active: ActiveCohort = {
    id: cohort.id,
    name: cohort.name,
    slug,
    department: cohort.department,
    domainKey,
    level: normalizedLevel,
    supervisorName: cohort.supervisorName,
    supervisorEmail: cohort.supervisorEmail,
    githubRepoUrl: cohort.githubRepoUrl,
    selectedAt: new Date().toISOString(),
  };

  fs.writeFileSync(getActiveCohortFile(), JSON.stringify(active, null, 2), "utf8");
  return active;
}

/**
 * Clear the active cohort context
 */
export function clearActiveCohort(): void {
  try {
    if (fs.existsSync(getActiveCohortFile())) {
      fs.unlinkSync(getActiveCohortFile());
    }
  } catch {}
}
