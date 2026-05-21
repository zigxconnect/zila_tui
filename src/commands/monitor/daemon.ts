import chokidar from "chokidar";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  appendEvent,
  writeMonitorPid,
  type FileEvent,
  type CommitEvent,
} from "../../utils/monitor.js";

//  Start

const workspacePath = process.argv[2];
if (!workspacePath) {
  process.stderr.write("daemon: missing workspacePath argument\n");
  process.exit(1);
}

// Write PID immediately so the parent process can confirm we started
writeMonitorPid(workspacePath, process.pid);

//  File watcher

const IGNORED = [
  path.join(workspacePath, "node_modules"),
  path.join(workspacePath, ".git"),
  path.join(workspacePath, ".zila"),
  /\.pyc$/,
  /\.log$/,
  /__pycache__/,
];

const watcher = chokidar.watch(workspacePath, {
  ignored: IGNORED,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100,
  },
});

function recordFile(type: FileEvent["type"], filePath: string): void {
  const rel = path.relative(workspacePath!, filePath);
  // Skip hidden files and anything that slipped through the ignored list
  if (rel.startsWith(".") || rel.includes("node_modules")) return;
  appendEvent(workspacePath!, {
    type,
    path: rel,
    ts: new Date().toISOString(),
  });
}

watcher
  .on("add", (p) => recordFile("add", p))
  .on("change", (p) => recordFile("change", p))
  .on("unlink", (p) => recordFile("unlink", p));

//  Git commit polling

let lastKnownHash: string | null = null;

function pollGit(): void {
  try {
    // 1. Fetch the last 20 commit hashes + metadata (no stat — clean output)
    const metaLog = execSync(
      `git -C "${workspacePath}" log --pretty=format:"%H|||%s|||%aI" -20`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();

    if (!metaLog) return;

    const metaLines = metaLog.split("\n").filter(Boolean);
    const newEntries: CommitEvent[] = [];

    for (const line of metaLines) {
      const parts = line.split("|||");
      if (parts.length < 3) continue;

      const [hash, msg, ts] = parts as [string, string, string];
      if (hash === lastKnownHash) break; // we've seen everything from here on

      // 2. Fetch stat for this individual commit
      let diff_stat = "";
      try {
        diff_stat = execSync(
          `git -C "${workspacePath}" show --stat --format="" ${hash}`,
          { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        ).trim();
      } catch {
        /* non-fatal — stat is informational only */
      }

      newEntries.push({
        type: "commit",
        hash,
        msg,
        diff_stat,
        ts, 
      });
    }

    // Append in chronological order (oldest first)
    for (const ev of newEntries.reverse()) {
      appendEvent(workspacePath!, ev);
    }

    // Advance the cursor to the latest commit
    const latestHash = metaLines[0]?.split("|||")[0];
    if (latestHash) lastKnownHash = latestHash;
  } catch {
    // Git not available or not a repo — silently skip
  }
}

try {
  lastKnownHash =
    execSync(`git -C "${workspacePath}" log --pretty=format:"%H" -1`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim() || null;
} catch {
  // No commits yet or not a git repo — start from scratch
}

const POLL_INTERVAL_MS = 30_000;
const pollTimer = setInterval(pollGit, POLL_INTERVAL_MS);

// Graceful shutdown

function shutdown(): void {
  clearInterval(pollTimer);
  watcher.close().then(() => {});
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGHUP", shutdown);
