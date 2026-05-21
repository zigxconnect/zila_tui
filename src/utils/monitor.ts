import fs from "node:fs";
import path from "node:path";
import {
  getMonitorDir,
  getMonitorPidPath,
  getMonitorLogPath,
} from "./workspace.js";

// types
export type MonitorEventType = "add" | "change" | "unlink" | "commit";

export interface FileEvent {
  type: "add" | "change" | "unlink";
  path: string;
  ts: string; // ISO timestamp
}

export interface CommitEvent {
  type: "commit";
  hash: string;
  msg: string;
  diff_stat: string;
  ts: string;
}

export type MonitorEvent = FileEvent | CommitEvent;

export function isMonitorRunning(workspacePath: string): boolean {
  const pidPath = getMonitorPidPath(workspacePath);
  if (!fs.existsSync(pidPath)) return false;

  try {
    const pid = parseInt(fs.readFileSync(pidPath, "utf-8").trim(), 10);
    process.kill(pid, 0); // Check if process is alive
    return true;
  } catch {
    try {
      fs.unlinkSync(pidPath); // Stale PID file, remove it
    } catch {
      /* Ignore errors */
    }
    return false;
  }
}

export function writeMonitorPid(workspacePath: string, pid: number): void {
  const dir = getMonitorDir(workspacePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getMonitorPidPath(workspacePath), String(pid), "utf-8");
}

export function clearMonitorPid(workspacePath: string): void {
  try {
    fs.unlinkSync(getMonitorPidPath(workspacePath));
  } catch {
    /* Ignore errors */
  }
}

export function getMonitorPid(workspacePath: string): number | null {
  const pidPath = getMonitorPidPath(workspacePath);
  if (!fs.existsSync(pidPath)) return null;
  const val = parseInt(fs.readFileSync(pidPath, "utf-8").trim(), 10);
  return isNaN(val) ? null : val;
}

export function appendEvent(workspacePath: string, event: MonitorEvent): void {
  const dir = getMonitorDir(workspacePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const line = JSON.stringify(event) + "\n";
  fs.appendFileSync(getMonitorLogPath(workspacePath), line, "utf-8");
}

export function readEvents(workspacePath: string): MonitorEvent[] {
  const logPath = getMonitorLogPath(workspacePath);
  if (!fs.existsSync(logPath)) return [];
  const raw = fs.readFileSync(logPath, "utf-8");
  const events: MonitorEvent[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as MonitorEvent);
    } catch {
      /* skip malformed */
    }
  }
  return events;
}

export function readEventsInRange(
  workspacePath: string,
  from: Date,
  to: Date,
): MonitorEvent[] {
  return readEvents(workspacePath).filter((e) => {
    const ts = new Date(e.ts).getTime();

    if (isNaN(ts)) return false;
    return ts >= from.getTime() && ts <= to.getTime();
  });
}

export function getWeekRange(
  weekNumber: number,
  createdAt: string,
): { from: Date; to: Date } {
  const start = new Date(createdAt);
  if (isNaN(start.getTime())) {
    throw new Error(`Invalid createdAt date: "${createdAt}"`);
  }

  // Normalise to the Monday of the creation week (ISO: Mon = day 0)
  const day = start.getDay();
  const monday = new Date(start);
  monday.setDate(start.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const from = new Date(monday);
  from.setDate(monday.getDate() + (weekNumber - 1) * 7);

  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

export function getCurrentWeekNumber(createdAt: string): number {
  const { from } = getWeekRange(1, createdAt);
  const now = Date.now();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((now - from.getTime()) / msPerWeek) + 1);
}
