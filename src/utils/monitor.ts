import fs from "node:fs";
import path from "node:path";
import {
  getMonitorDir,
  getMonitorPidPath,
  getMonitorLogPath,
} from "./workspace.js";

// Types

export type MonitorEventType = "add" | "change" | "unlink" | "commit";

export interface FileEvent {
  type: "add" | "change" | "unlink";
  path: string;
  ts: string; // ISO
}

export interface CommitEvent {
  type: "commit";
  hash: string;
  msg: string;
  diff_stat: string;
  ts: string; // ISO
}

export type MonitorEvent = FileEvent | CommitEvent;

/** One discrete monitoring session */
export interface MonitorSession {
  id: string;       // ISO timestamp of start used as a unique key
  startedAt: string; // ISO
  stoppedAt: string | null; // null if still running
}

//Path helpers
function sessionsPath(workspacePath: string): string {
  return path.join(getMonitorDir(workspacePath), "sessions.jsonl");
}

//PID helpers

export function isMonitorRunning(workspacePath: string): boolean {
  const pidPath = getMonitorPidPath(workspacePath);
  if (!fs.existsSync(pidPath)) return false;
  try {
    const pid = parseInt(fs.readFileSync(pidPath, "utf-8").trim(), 10);
    process.kill(pid, 0); // probe — throws if dead
    return true;
  } catch {
    try { fs.unlinkSync(pidPath); } catch { /* stale — ignore */ }
    return false;
  }
}

export function writeMonitorPid(workspacePath: string, pid: number): void {
  const dir = getMonitorDir(workspacePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getMonitorPidPath(workspacePath), String(pid), "utf-8");
}

export function clearMonitorPid(workspacePath: string): void {
  try { fs.unlinkSync(getMonitorPidPath(workspacePath)); } catch { /* ignore */ }
}

export function getMonitorPid(workspacePath: string): number | null {
  const pidPath = getMonitorPidPath(workspacePath);
  if (!fs.existsSync(pidPath)) return null;
  const val = parseInt(fs.readFileSync(pidPath, "utf-8").trim(), 10);
  return isNaN(val) ? null : val;
}

function findLast<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    const item = arr[i];
    if (item !== undefined && predicate(item)) return item;
  }
  return undefined;
}

//Session helpers

export function startSession(workspacePath: string): MonitorSession {
  const dir = getMonitorDir(workspacePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const session: MonitorSession = {
    id: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    stoppedAt: null,
  };
  fs.appendFileSync(sessionsPath(workspacePath), JSON.stringify(session) + "\n", "utf-8");
  return session;
}

export function stopSession(workspacePath: string): void {
  const sp = sessionsPath(workspacePath);
  if (!fs.existsSync(sp)) return;

  const lines = fs.readFileSync(sp, "utf-8").split("\n").filter(Boolean);
  const sessions: MonitorSession[] = lines.map((l) => {
    try { return JSON.parse(l) as MonitorSession; } catch { return null; }
  }).filter((s): s is MonitorSession => s !== null);

  // Close the last open session
  const last = findLast(sessions, (s) => s.stoppedAt === null);
  if (last) {
    last.stoppedAt = new Date().toISOString();
  }

  fs.writeFileSync(sp, sessions.map((s) => JSON.stringify(s)).join("\n") + "\n", "utf-8");
}

export function readSessions(workspacePath: string): MonitorSession[] {
  const sp = sessionsPath(workspacePath);
  if (!fs.existsSync(sp)) return [];
  return fs.readFileSync(sp, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as MonitorSession; } catch { return null; } })
    .filter((s): s is MonitorSession => s !== null);
}

/** Returns the most recent session regardless of whether it's still open */
export function getLastSession(workspacePath: string): MonitorSession | null {
  const sessions = readSessions(workspacePath);
  return sessions.length > 0 ? sessions[sessions.length - 1]! : null;
}

/** Returns the currently-open session, or null */
export function getActiveSession(workspacePath: string): MonitorSession | null {
  const sessions = readSessions(workspacePath);
  return findLast(sessions, (s) => s.stoppedAt === null) ?? null;
}

//Event helpers

export function appendEvent(workspacePath: string, event: MonitorEvent): void {
  const dir = getMonitorDir(workspacePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(getMonitorLogPath(workspacePath), JSON.stringify(event) + "\n", "utf-8");
}

export function readEvents(workspacePath: string): MonitorEvent[] {
  const logPath = getMonitorLogPath(workspacePath);
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as MonitorEvent; } catch { return null; } })
    .filter((e): e is MonitorEvent => e !== null);
}

export function readEventsInRange(
  workspacePath: string,
  from: Date,
  to: Date,
): MonitorEvent[] {
  return readEvents(workspacePath).filter((e) => {
    const ts = new Date(e.ts).getTime();
    return !isNaN(ts) && ts >= from.getTime() && ts <= to.getTime();
  });
}

/** Read all events that fall within a specific session */
export function readEventsForSession(
  workspacePath: string,
  session: MonitorSession,
): MonitorEvent[] {
  const from = new Date(session.startedAt);
  const to   = session.stoppedAt ? new Date(session.stoppedAt) : new Date();
  return readEventsInRange(workspacePath, from, to);
}

//Week helpers
export function getWeekRange(
  weekNumber: number,
  createdAt: string,
): { from: Date; to: Date } {
  const start = new Date(createdAt);
  if (isNaN(start.getTime())) throw new Error(`Invalid createdAt date: "${createdAt}"`);

  const day    = start.getDay();
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
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((Date.now() - from.getTime()) / msPerWeek) + 1);
}