import type { ZilaCommand } from "./registry.js";
import {
  saveGitHubToken,
  loadGitHubAuth,
  clearGitHubAuth,
  verifyGitHubToken,
} from "../utils/githubAuth.js";

export const githubAuthCommand: ZilaCommand = {
  name: "gh-auth",
  aliases: ["github-auth", "gh-login"],
  description: "Authenticate with GitHub using your Personal Access Token",
  usage: "gh-auth [token]",
  category: "auth",
  available: true,
  handler: async (args, output) => {
    let token = args[0];

    if (!token) {
      output("[GITHUB] Please provide your GitHub Personal Access Token (PAT).", "info");
      output("Usage: zila gh-auth <your-github-token>", "warning");
      output("Create a token at https://github.com/settings/tokens (scopes: repo, read:user)", "dim");
      return;
    }

    token = token.trim();
    output("[GITHUB] Verifying credentials with GitHub API...", "info");

    const verification = await verifyGitHubToken(token);

    if (!verification.valid || !verification.username) {
      output(`[ERROR] GitHub authentication failed: ${verification.error || 'Invalid token'}`, "error");
      return;
    }

    saveGitHubToken(token, verification.username, verification.name || null, verification.email || null);

    output("", "default");
    output("================================================================================", "info");
    output(`[SUCCESS] Authenticated as GitHub user: @${verification.username}`, "success");
    if (verification.name) {
      output(`Name:   ${verification.name}`, "dim");
    }
    output(`Token:  Stored securely in ~/.zila/github.json`, "dim");
    output("================================================================================", "info");
    output("", "default");
    output("[READY] You can now collaborate with git, download course repos, and submit PRs.", "dim");
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
      output("Run 'zila gh-auth <token>' to connect your GitHub account.", "dim");
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
    output("[GITHUB] Logged out successfully. Token removed.", "success");
  },
};
