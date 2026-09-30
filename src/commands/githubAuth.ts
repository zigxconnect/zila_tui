import type { ZilaCommand } from "./registry.js";
import {
  authenticateWithGitHub,
  loadGitHubAuth,
  clearGitHubAuth,
} from "../utils/githubAuth.js";

export const githubAuthCommand: ZilaCommand = {
  name: "github-auth",
  aliases: ["gh-auth", "gh-login"],
  description: "Connect your GitHub account in a browser",
  usage: "github-auth",
  category: "auth",
  available: true,
  handler: async (args, output) => {
    const clientId = process.env.ZILA_GITHUB_CLIENT_ID;
    if (!clientId) {
      output("[ERROR] GitHub OAuth is not configured for this installation.", "error");
      output("Set ZILA_GITHUB_CLIENT_ID to the client ID of the Zila GitHub OAuth App.", "dim");
      return;
    }

    if (args.length > 0) {
      output("Usage: zila github-auth", "warning");
      output("GitHub login no longer accepts pasted tokens; authorization opens in your browser.", "dim");
      return;
    }

    output("[GITHUB] Starting secure browser authorization...", "info");
    try {
      const account = await authenticateWithGitHub(clientId, (verificationUri, userCode) => {
        output(`[GITHUB] Open ${verificationUri} and enter code: ${userCode}`, "info");
        output("Waiting for you to approve GitHub access...", "dim");
      });

      output("", "default");
      output("================================================================================", "info");
      output(`[SUCCESS] Authenticated as GitHub user: @${account.username}`, "success");
      if (account.name) output(`Name:   ${account.name}`, "dim");
      output("Account access token stored in ~/.zila/github.json", "dim");
      output("================================================================================", "info");
      output("[READY] GitHub access is ready for course repositories and task submissions.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown authorization error";
      output(`[ERROR] GitHub authentication failed: ${message}`, "error");
    }
  },
};

export const githubStatusCommand: ZilaCommand = {
  name: "gh-status",
  aliases: ["github-status", "gh-whoami"],
  description: "Check GitHub authentication status",
  usage: "gh-status",
  category: "auth",
  available: true,
  handler: async (_args, output) => {
    const auth = loadGitHubAuth();

    if (!auth) {
      output("[GITHUB] Not authenticated with GitHub.", "warning");
      output("Run 'zila github-auth' to connect your GitHub account.", "dim");
      return;
    }

    output("", "default");
    output("GITHUB ACCOUNT STATUS:", "info");
    output("--------------------------------------------------------------------------------", "dim");
    output(`Username:   @${auth.username}`, "success");
    if (auth.name) {
      output(`Name:       ${auth.name}`, "default");
    }
    if (auth.email) {
      output(`Email:      ${auth.email}`, "default");
    }
    output(`Stored At:  ${new Date(auth.storedAt).toLocaleString()}`, "dim");
    output(`Status:     Connected & Ready for Git Collaboration`, "success");
    output("--------------------------------------------------------------------------------", "dim");
  },
};

export const githubLogoutCommand: ZilaCommand = {
  name: "gh-logout",
  aliases: ["github-logout"],
  description: "Disconnect your GitHub account",
  usage: "gh-logout",
  category: "auth",
  available: true,
  handler: async (_args, output) => {
    clearGitHubAuth();
    output("[GITHUB] Logged out successfully. GitHub authorization removed.", "success");
  },
};
