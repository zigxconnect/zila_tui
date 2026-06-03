import chokidar from "chokidar";
import { execSync } from "node:child_process";
import path from "node:path";
import {
  appendEvent,
  writeMonitorPid,
  type FileEvent,
  type CommitEvent,
} from "../../utils/monitor.js";

const watchPath = process.argv[2];
if (!watchPath) {
  process.stderr.write("daemon: missing watchPath argument\n");
  process.exit(1);
}

// Write PID immediately so the parent can confirm we started
writeMonitorPid(watchPath, process.pid);

// File watcher 
const IGNORED = [
  path.join(watchPath, ".zila"),       // our own data dir
  path.join(watchPath, ".git"),
  path.join(watchPath, "node_modules"),
  /\.pyc$/,
  /\.log$/,
  /__pycache__/,
  /\.DS_Store/,
  /Thumbs\.db/,
];

const watcher = chokidar.watch(watchPath, {
  ignored: IGNORED,
  persistent: true,
  ignoreInitial: true,          // don't flood on startup
  awaitWriteFinish: {
    stabilityThreshold: 300,    // ms file must be stable before emitting
    pollInterval: 100,
  },
});

function recordFile(type: FileEvent["type"], filePath: string): void {
  const rel = path.relative(watchPath!, filePath);
  if (
    rel.startsWith(".") ||
    rel.includes("node_modules") ||
    rel.includes("__pycache__") ||
    rel.endsWith(".pyc")
  ) return;

  appendEvent(watchPath!, { type, path: rel, ts: new Date().toISOString() });
}

watcher
  .on("add",    (p) => recordFile("add",    p))
  .on("change", (p) => recordFile("change", p))
  .on("unlink", (p) => recordFile("unlink", p));

// Git commit poller 

let lastKnownHash: string | null = null;

function pollGit(): void {
  try {
    const metaLog = execSync(
      `git -C "${watchPath}" log --pretty=format:"%H|||%s|||%aI" -20`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();

    if (!metaLog) return;

    const metaLines = metaLog.split("\n").filter(Boolean);
    const newEntries: CommitEvent[] = [];

    for (const line of metaLines) {
      const parts = line.split("|||");
      if (parts.length < 3) continue;
      const [hash, msg, ts] = parts as [string, string, string];
      if (hash === lastKnownHash) break; // already seen everything from here

      let diff_stat = "";
      try {
        diff_stat = execSync(
          `git -C "${watchPath}" show --stat --format="" ${hash}`,
          { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        ).trim();
      } catch { /* non-fatal */ }

      newEntries.push({ type: "commit", hash, msg, diff_stat, ts });
    }

    // Write oldest-first
    for (const ev of newEntries.reverse()) {
      appendEvent(watchPath!, ev);
    }

    const latestHash = metaLines[0]?.split("|||")[0];
    if (latestHash) lastKnownHash = latestHash;
  } catch {
    // Not a git repo or git unavailable
  }
}

try {
  lastKnownHash = execSync(
    `git -C "${watchPath}" log -1 --pretty=format:"%H"`,
    { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
  ).trim() || null;
} catch { /* no commits yet */ }

const pollTimer = setInterval(pollGit, 30_000);

// Graceful shutdown 

function shutdown(): void {
  clearInterval(pollTimer);
  watcher.close().catch(() => {});
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT",  shutdown);
process.on("SIGHUP",  shutdown);