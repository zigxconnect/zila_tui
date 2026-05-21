import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { profile } from "node:console";

const ZILA_DIR_NAME = path.join(os.homedir(), ".zila");

const CONFIG_PATH = path.join(ZILA_DIR_NAME, "config.json");

export interface WorkspaceConfig {
  workspacePath: string;
  curriculumPath: string;
  assistantPath: string;
  department: string;
  level: string;
  studentName: string;
  createdAt: string;
}

export async function saveWorkspace(
  workspaceRoot: string,
  profile: { department: string; level: string; studentName: string },
): Promise<void> {
  const config: WorkspaceConfig = {
    workspacePath: workspaceRoot,
    curriculumPath: path.join(workspaceRoot, "internship", "curriculum"),
    assistantPath: path.join(workspaceRoot, "src", "assistant"),
    createdAt: new Date().toISOString(),
    department: profile.department,
    level: profile.level,
    studentName: profile.studentName,
  };

  await fs.mkdir(ZILA_DIR_NAME, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function loadWorkspace(): Promise<WorkspaceConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");

    const parsed = JSON.parse(raw) as Partial<WorkspaceConfig>;

    return {
      department: parsed.department || "unknown",
      level: parsed.level || "unknown",
      studentName: parsed.studentName || "unknown",
      ...parsed,
    } as WorkspaceConfig;
  } catch {
    return null;
  }
}

export async function hasWorkspace(): Promise<boolean> {
  try {
    await fs.access(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}

export const CONFIG_FILE_PATH = CONFIG_PATH;

export function getMonitorDir(workspacePath: string): string {
  return path.join(workspacePath, ".zila");
}

export function getMonitorPidPath(workspacePath: string): string {
  return path.join(getMonitorDir(workspacePath), "monitor.pid");
}

export function getMonitorLogPath(workspacePath: string): string {
  return path.join(getMonitorDir(workspacePath), "events.jsonl");
}

export function getLogbookDir(workspacePath: string): string {
  return path.join(getMonitorDir(workspacePath), "logbooks");
}
