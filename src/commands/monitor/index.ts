import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ZilaCommand } from "../registry.js";
import { loadWorkspace } from "../../utils/workspace.js";
import {
  isMonitorRunning,
  getMonitorPid,
  clearMonitorPid,
  readEvents,
  type CommitEvent,
  type FileEvent,
} from "../../utils/monitor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function daemonPath(): string {
  return path.join(__dirname, "daemon.js");
}

async function waitForMonitorStart(
  workspacePath: string,
  maxWaitMs = 2000,
  intervalMs = 100,
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (isMonitorRunning(workspacePath)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

export const monitorCommand: ZilaCommand = {
  name: "monitor",
  aliases: ["monitor", "track"],
  description:
    "Start monitoring file changes and git commits in your workspace",
  usage: "monitor <start|stop|status>",
  category: "workflow",
  available: true,

  handler: async (args, output, shellContext) => {
    const sub = args[0]?.toLowerCase();

    const ws = await loadWorkspace();
    if (!ws) {
      output("No workspace found. Please run 'init' first.", "error");
      return;
    }

    const { workspacePath } = ws;

    // start
    if (!sub || sub === "start") {
      if (isMonitorRunning(workspacePath)) {
        const pid = getMonitorPid(workspacePath);
        output(`Monitor is already running (PID: ${pid}).`, "warning");
        return;
      }

      const daemon = spawn(process.execPath, [daemonPath(), workspacePath], {
        detached: true,
        stdio: "ignore",
      });
      daemon.unref();

      const started = await waitForMonitorStart(workspacePath);

      if (started) {
        output(`Monitor started (PID ${daemon.pid}).`, "success");
        output(`Watching: ${workspacePath}`, "dim");
        output("Events are saved to  .zila/events.jsonl", "dim");
      } else {
        output(
          "Monitor failed to start. Check that chokidar is installed.",
          "error",
        );
        output("Run:  npm install chokidar  inside your project root.", "dim");
      }
      return;
    }

    // stop
    if (sub === "stop") {
      if (!isMonitorRunning(workspacePath)) {
        output("Monitor is not running.", "warning");
        return;
      }

      const pid = getMonitorPid(workspacePath);
      if (pid === null) {
        output("Could not read PID file.", "error");
        return;
      }

      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Already closed
      }

      const deadline = Date.now() + 1500;
      let dead = false;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 150));
        try {
          process.kill(pid, 0);
        } catch {
          dead = true;
          break;
        }
      }

      if (!dead) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          // Already forced dead
        }
      }

      clearMonitorPid(workspacePath);
      output("Monitor stopped.", "success");
      return;
    }

    // status
    if (sub === "status") {
      const running = isMonitorRunning(workspacePath);
      const pid = getMonitorPid(workspacePath);
      const events = readEvents(workspacePath);

      if (running) {
        output(
          `Monitor is active and tracking changes (PID: ${pid}).`,
          "success",
        );
      } else {
        output("Monitor is not running.", "warning");
      }

      if (events.length === 0) {
        output(
          "No workspace activity recorded yet. Run some tasks or commits first!",
          "warning",
        );
        return;
      }

      // Group events by local date string YYYY-MM-DD
      const groupedByDay = new Map<string, typeof events>();
      for (const e of events) {
        const d = new Date(e.ts);
        if (isNaN(d.getTime())) continue;
        const dateStr = d.toISOString().split("T")[0]!;
        const existing = groupedByDay.get(dateStr) ?? [];
        existing.push(e);
        groupedByDay.set(dateStr, existing);
      }

      const todayStr = new Date().toISOString().split("T")[0]!;
      let activeDayStr = todayStr;
      let activeEvents = groupedByDay.get(todayStr) ?? [];

      if (activeEvents.length === 0) {
        // Fallback: find the latest date in the past with recorded events
        const sortedDays = Array.from(groupedByDay.keys()).sort((a, b) =>
          b.localeCompare(a),
        );
        const latestDay = sortedDays[0];
        if (latestDay) {
          activeDayStr = latestDay;
          activeEvents = groupedByDay.get(latestDay)!;
        }
      }

      output(`\nActivity report for day: ${activeDayStr}`, "success");
      if (activeEvents.length === 0) {
        output("No activity found for today or any past days.", "dim");
        return;
      }

      const fileEvents = activeEvents.filter((e) => e.type !== "commit");
      const commitEvents = activeEvents.filter((e) => e.type === "commit");

      const firstEv = activeEvents[0]!;
      const lastEv = activeEvents[activeEvents.length - 1]!;
      const startTime = new Date(firstEv.ts).toLocaleTimeString();
      const endTime = new Date(lastEv.ts).toLocaleTimeString();

      output(`Session time window: ${startTime} - ${endTime}`, "default");
      output(
        `Total files modified/created: ${new Set(fileEvents.map((e) => (e as any).path)).size}`,
        "dim",
      );
      output(`Total commits: ${commitEvents.length}`, "dim");

      if (fileEvents.length > 0) {
        output("\nChanged Files:", "info");
        const uniqueFiles = new Map<
          string,
          { adds: number; changes: number; unlinks: number }
        >();
        for (const fe of fileEvents as any[]) {
          const stats = uniqueFiles.get(fe.path) ?? {
            adds: 0,
            changes: 0,
            unlinks: 0,
          };
          if (fe.type === "add") stats.adds++;
          else if (fe.type === "change") stats.changes++;
          else if (fe.type === "unlink") stats.unlinks++;
          uniqueFiles.set(fe.path, stats);
        }
        for (const [f, stats] of uniqueFiles.entries()) {
          const acts: string[] = [];
          if (stats.adds > 0) acts.push(`added x${stats.adds}`);
          if (stats.changes > 0) acts.push(`modified x${stats.changes}`);
          if (stats.unlinks > 0) acts.push(`deleted x${stats.unlinks}`);
          output(`  ${f} (${acts.join(", ")})`, "dim");
        }
      }

      if (commitEvents.length > 0) {
        output("\nCommits Created:", "info");
        for (const c of commitEvents as any[]) {
          output(`  [${c.hash.slice(0, 7)}] ${c.msg}`, "dim");
        }
      }
      return;
    }

    output(
      `Unknown subcommand: "${sub}". Use  monitor start | stop | status`,
      "error",
    );
  },
};
