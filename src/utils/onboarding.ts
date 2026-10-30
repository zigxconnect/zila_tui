import fs from "node:fs";
import path from "node:path";
import { getZilaDir } from "./activeCohort.js";

const LIL_AGENT_WELCOME_FILE = "lil_agent_welcome_seen";

function getWelcomeFilePath(): string {
  return path.join(getZilaDir(), LIL_AGENT_WELCOME_FILE);
}

export function hasSeenLilAgentWelcome(): boolean {
  return fs.existsSync(getWelcomeFilePath());
}

export function markLilAgentWelcomeSeen(): void {
  const filePath = getWelcomeFilePath();
  try {
    fs.writeFileSync(filePath, "seen\n", { encoding: "utf8", mode: 0o600 });
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Welcome visibility should not prevent the agent from starting.
  }
}