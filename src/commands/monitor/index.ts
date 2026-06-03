import { spawn }           from "node:child_process";
import path                from "node:path";
import { fileURLToPath }   from "node:url";
import type { ZilaCommand } from "../registry.js";
import { loadWorkspace }   from "../../utils/workspace.js";
import {
  isMonitorRunning,
  getMonitorPid,
  clearMonitorPid,
  startSession,
  stopSession,
  getActiveSession,
  getLastSession,
  readEventsForSession,
} from "../../utils/monitor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function daemonPath(): string {
  return path.join(__dirname, "daemon.js");
}

async function waitForStart(workspacePath: string, maxMs = 3000): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (isMonitorRunning(workspacePath)) return true;
    await new Promise((r) => setTimeout(r, 120));
  }
  return false;
}

function elapsedLabel(from: string, to?: string | null): string {
  const start = new Date(from).getTime();
  const end   = to ? new Date(to).getTime() : Date.now();
  const mins  = Math.round((end - start) / 60_000);
  if (mins < 1)   return "< 1 min";
  if (mins < 60)  return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export const monitorCommand: ZilaCommand = {
  name:        "monitor",
  aliases:     ["track"],
  description: "Track file changes and git commits in your curriculum directory",
  usage:       "monitor <start|stop|status>",
  category:    "workflow",
  available:   true,

  handler: async (args, output) => {
    const sub = (args[0] ?? "").toLowerCase();

    const ws = await loadWorkspace();
    if (!ws) {
      output("No workspace found. Run  zila init  first.", "error");
      return;
    }

    // The directory we watch is always the curriculum, not the project root
    const watchPath = ws.curriculumPath;

    // start
    if (!sub || sub === "start") {
      if (isMonitorRunning(watchPath)) {
        const pid = getMonitorPid(watchPath);
        output(`Monitor is already running (PID ${pid}).`, "warning");
        output(`Watching: ${watchPath}`, "dim");
        output("Run  monitor stop  when you finish working.", "dim");
        return;
      }

      // Spawn the daemon, passing the curriculum path as the watch target
      const daemon = spawn(
        process.execPath,
        [daemonPath(), watchPath],
        { detached: true, stdio: "ignore" },
      );
      daemon.unref();

      const started = await waitForStart(watchPath);

      if (!started) {
        output("Monitor failed to start.", "error");
        output("Make sure  chokidar  is installed:  npm install chokidar", "dim");
        return;
      }

      // Open a new session record
      startSession(watchPath);

      output("Monitor started.", "success");
      output(`Watching:  ${watchPath}`, "dim");
      output("", "default");
      output("All file changes and git commits are being tracked.", "dim");
      output("You can use other  zila  commands or work normally in your terminal.", "dim");
      output("Run  monitor stop  when you finish your session.", "dim");
      output("Run  monitor status  to see what has been tracked so far.", "dim");
      return;
    }

    // stop
    if (sub === "stop") {
      if (!isMonitorRunning(watchPath)) {
        output("Monitor is not running.", "warning");
        return;
      }

      const pid = getMonitorPid(watchPath);

      if (pid !== null) {
        try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ }

        // Wait up to 2 s then force-kill
        const deadline = Date.now() + 2000;
        let dead = false;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 150));
          try { process.kill(pid, 0); } catch { dead = true; break; }
        }
        if (!dead) { try { process.kill(pid, "SIGKILL"); } catch { /* ignore */ } }
      }

      clearMonitorPid(watchPath);
      stopSession(watchPath);

      // Show a brief summary of the session that just ended
      const lastSession = getLastSession(watchPath);
      if (lastSession) {
        const events      = readEventsForSession(watchPath, lastSession);
        const fileEvents  = events.filter((e) => e.type !== "commit");
        const commits     = events.filter((e) => e.type === "commit");
        const elapsed     = elapsedLabel(lastSession.startedAt, lastSession.stoppedAt);
        const uniqueFiles = new Set(fileEvents.map((e) => (e as { path: string }).path));

        output("Monitor stopped.", "success");
        output("", "default");
        output("Session summary:", "default");
        output(`  Started:       ${formatTs(lastSession.startedAt)}`, "dim");
        output(`  Duration:      ${elapsed}`, "dim");
        output(`  File events:   ${fileEvents.length} (${uniqueFiles.size} unique file${uniqueFiles.size !== 1 ? "s" : ""})`, "dim");
        output(`  Commits:       ${commits.length}`, "dim");
        output("", "default");
        output("Data saved to  .zila/events.jsonl  and  .zila/sessions.jsonl", "dim");
        output("Run  logbook  to generate this week's report.", "dim");
      } else {
        output("Monitor stopped.", "success");
      }
      return;
    }

    // status
    if (sub === "status") {
      const running       = isMonitorRunning(watchPath);
      const activeSession = getActiveSession(watchPath);
      const lastSession   = getLastSession(watchPath);

      // Running: show current session so far
      if (running && activeSession) {
        const events      = readEventsForSession(watchPath, activeSession);
        const fileEvents  = events.filter((e) => e.type !== "commit");
        const commits     = events.filter((e) => e.type === "commit");
        const uniqueFiles = [...new Set(fileEvents.map((e) => (e as { path: string }).path))];
        const elapsed     = elapsedLabel(activeSession.startedAt);

        output("", "default");
        output("● Monitor is running", "success");
        output(`  Watching:  ${watchPath}`, "dim");
        output(`  Started:   ${formatTs(activeSession.startedAt)}  (${elapsed} ago)`, "dim");
        output("", "default");

        output("Current session:", "default");
        output(`  File events:  ${fileEvents.length}`, "dim");
        output(`  Commits:      ${commits.length}`, "dim");

        if (uniqueFiles.length > 0) {
          output("", "default");
          output("Files touched this session:", "dim");
          uniqueFiles.slice(0, 15).forEach((f) => output(`    ${f}`, "dim"));
          if (uniqueFiles.length > 15) output(`    … and ${uniqueFiles.length - 15} more`, "dim");
        }

        if (commits.length > 0) {
          output("", "default");
          output("Commits this session:", "dim");
          for (const ev of commits) {
            const c = ev as { type: "commit"; hash: string; msg: string; ts: string };
            output(`    ${c.hash.slice(0, 7)}  ${c.msg}  (${formatTs(c.ts)})`, "dim");
          }
        }

        output("", "default");
        output("Run  monitor stop  when you finish your session.", "dim");
        return;
      }

      // Not running: show most recent past session─
      if (!running) {
        output("● Monitor is not running", "warning");
        output("", "default");

        if (!lastSession || lastSession.stoppedAt === null) {
          output("No completed sessions found.", "dim");
          output("Run  monitor start  before you begin working.", "dim");
          return;
        }

        const today    = new Date().toDateString();
        const sessDate = new Date(lastSession.startedAt).toDateString();
        const label    = sessDate === today ? "today's session" : `session on ${new Date(lastSession.startedAt).toLocaleDateString()}`;

        const events      = readEventsForSession(watchPath, lastSession);
        const fileEvents  = events.filter((e) => e.type !== "commit");
        const commits     = events.filter((e) => e.type === "commit");
        const uniqueFiles = [...new Set(fileEvents.map((e) => (e as { path: string }).path))];
        const elapsed     = elapsedLabel(lastSession.startedAt, lastSession.stoppedAt);

        output(`Showing ${label}:`, "default");
        output(`  Started:   ${formatTs(lastSession.startedAt)}`, "dim");
        output(`  Stopped:   ${formatTs(lastSession.stoppedAt!)}`, "dim");
        output(`  Duration:  ${elapsed}`, "dim");
        output("", "default");
        output(`  File events:  ${fileEvents.length}`, "dim");
        output(`  Commits:      ${commits.length}`, "dim");

        if (uniqueFiles.length > 0) {
          output("", "default");
          output("Files touched:", "dim");
          uniqueFiles.slice(0, 15).forEach((f) => output(`    ${f}`, "dim"));
          if (uniqueFiles.length > 15) output(`    … and ${uniqueFiles.length - 15} more`, "dim");
        }

        if (commits.length > 0) {
          output("", "default");
          output("Commits:", "dim");
          for (const ev of commits) {
            const c = ev as { type: "commit"; hash: string; msg: string; ts: string };
            output(`    ${c.hash.slice(0, 7)}  ${c.msg}`, "dim");
          }
        }

        if (sessDate !== today) {
          output("", "default");
          output("Nothing tracked today yet.", "dim");
          output("Run  monitor start  to begin tracking.", "dim");
        }
        return;
      }

      // Running but no active session record (edge case — daemon started manually)
      output("● Monitor is running (no session record found)", "warning");
      output("Run  monitor stop  then  monitor start  to create a clean session.", "dim");
      return;
    }

    output(`Unknown subcommand: "${sub}". Use  monitor start | stop | status`, "error");
  },
};