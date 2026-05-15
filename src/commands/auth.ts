import type { ZilaCommand } from "./registry.js";
import { loadAuth, isTokenFresh, clearAuth } from "../utils/auth.js";

export const authCommand: ZilaCommand = {
  name: "auth",
  aliases: ["login"],
  description: "Authenticate with your Zigex account",
  usage: "auth [--logout]",
  category: "setup",
  available: true,
  handler: async (args, output, shell) => {
    // --logout flag
    if (args.includes("--logout") || args.includes("logout")) {
      clearAuth();
      output("Logged out. Run  zila auth  to sign in again.", "warning");
      return;
    }

    // --status flag
    if (args.includes("--status") || args.includes("status")) {
      const record = loadAuth();
      if (!record) {
        output("Not authenticated.", "error");
        output("Run  zila auth  to sign in.", "dim");
      } else if (!isTokenFresh(record)) {
        output("Session expired.", "error");
        output("Run  zila auth  to sign in again.", "dim");
        clearAuth();
      } else {
        const stored = new Date(record.storedAt);
        const expiresAt = new Date(stored.getTime() + 30 * 24 * 60 * 60 * 1000);
        output(`Signed in as  ${record.email}`, "success");
        output(`Session expires  ${expiresAt.toLocaleDateString()}`, "dim");
      }
      return;
    }

    // Default: open auth screen
    shell.startAuth();
  },
};