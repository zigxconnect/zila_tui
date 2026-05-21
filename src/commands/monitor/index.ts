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
  description: "Start monitoring file changes and git commits in your workspace",
  usage: "monitor <start|stop|status>",
  category: "workflow",
  available: true,
 
  handler: async (args, output, shellContext) => {
    const sub = args[0]?.toLowerCase();
 
    const ws = await loadWorkspace();
    if (!ws) {
      output("No workspace found. Please run 'setup' first.", "error");
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
      daemon.unref(); // allow parent to exit independently
 
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
        // Process already gone — that's fine, just clean up
      }
 
      // Wait up to 1.5 s for the process to exit, then force-kill if needed
      const deadline = Date.now() + 1500;
      let dead = false;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 150));
        try {
          process.kill(pid, 0); // still alive?
        } catch {
          dead = true;
          break;
        }
      }
 
      if (!dead) {
        // Escalate to SIGKILL — daemon is hanging
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          /* already gone */
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
        output(`Monitor is running (PID: ${pid}).`, "success");
      } else {
        output("Monitor is not running.", "warning");
      }
 
      const fileEvents = events.filter((e) => e.type !== "commit").length;
      const commitEvents = events.filter((e) => e.type === "commit").length;
 
      output(`Total events logged:  ${events.length}`, "dim");
      output(`  File changes: ${fileEvents}`, "dim");
      output(`  Commits:      ${commitEvents}`, "dim");
 
      if (events.length > 0) {
        const last = events[events.length - 1]!;
        const lastDate = new Date(last.ts);
        const displayTs = isNaN(lastDate.getTime())
          ? last.ts
          : lastDate.toLocaleString();
        output(`Last event: ${displayTs}`, "dim");
      }
      return;
    }
 
    output(
      `Unknown subcommand: "${sub}". Use  monitor start | stop | status`,
      "error",
    );
  },
};
 