import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LOG_DIR = path.join(os.homedir(), ".zila");
const LOG_PATH = path.join(LOG_DIR, "assistant-debug.log");

export function logAssistantDiagnostic(message: string): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
    fs.chmodSync(LOG_DIR, 0o700);
    fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${message}\n`, { mode: 0o600 });
    fs.chmodSync(LOG_PATH, 0o600);
  } catch {
    // Diagnostics must never prevent the assistant from running.
  }
}