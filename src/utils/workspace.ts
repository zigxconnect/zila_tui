import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const ZILA_DIR_NAME = path.join(os.homedir(), ".zila");

const CONFIG_PATH = path.join(ZILA_DIR_NAME, "config.json");

export interface WorkspaceConfig {
  workspacePath: string;
  curriculumPath: string;
  assistantPath: string;
  createdAt: string;
}

export async function saveWorkspace(workspaceRoot: string): Promise<void> {
  const config: WorkspaceConfig = {
    workspacePath: workspaceRoot,
    curriculumPath: path.join(workspaceRoot, ".curriculum"),
    assistantPath: path.join(workspaceRoot, ".assistant"),
    createdAt: new Date().toISOString(),
  };

  await fs.mkdir(ZILA_DIR_NAME, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export async function loadWorkspace(): Promise<WorkspaceConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as WorkspaceConfig;
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
