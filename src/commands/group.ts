import type { ZilaCommand } from "./registry.js";
import { loadAuth } from "../utils/auth.js";
import { env } from "process";

const API_BASE_URL = env.ZILA_API_URL || "http://localhost:5000";

export const groupCommand: ZilaCommand = {
  name: "group",
  aliases: ["peers", "colleagues", "cohort-members"],
  description: "View your fellow accepted interns and supervisor in your cohort",
  usage: "group [cohort-id]",
  category: "cohort",
  available: true,
  handler: async (args, output) => {
    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("[AUTH] Not authenticated. Run 'zila auth' to login.", "error");
      return;
    }

    try {
      output("[FETCH] Loading your cohort members and placements...", "info");

      // Use unified group endpoint
      const cohortIdParam = args[0] ? `/${args[0]}/peers` : "/group";
      const targetUrl = args[0]
        ? `${API_BASE_URL}/api/cohorts/${args[0]}/chat-group`
        : `${API_BASE_URL}/api/cohorts/group`;

      const res = await fetch(targetUrl, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!res.ok) {
        output(`[ERROR] Server responded with status ${res.status}`, "error");
        return;
      }

      const data = await res.json() as any;

      if (!data.cohort && !data.chatContext) {
        output("\n[NOTICE] No active cohort placement found.", "warning");
        output("Apply or complete acceptance in your student workspace to view your group.\n", "dim");
        return;
      }

      const cohort = data.cohort || {
        id: data.chatContext?.cohortId,
        name: data.chatContext?.cohortName,
        department: data.chatContext?.department,
      };

      const supervisor = data.supervisor || data.chatContext?.supervisorAdmin;
      const peers = data.peers || data.chatContext?.members || [];

      output("", "default");
      output("================================================================================", "info");
      output(`COHORT:      ${cohort.name}`, "success");
      output(`DEPARTMENT:  ${cohort.department || 'General'}`, "dim");
      if (supervisor) {
        output(`SUPERVISOR:  ${supervisor.name} <${supervisor.email}> [Admin]`, "info");
      } else {
        output(`SUPERVISOR:  [Pending Assignment]`, "dim");
      }
      output(`GROUP ID:    ${cohort.id}`, "dim");
      output("================================================================================", "info");
      output("", "default");

      if (peers.length === 0) {
        output("  No other accepted interns in this track yet.", "dim");
        output("  New group members will appear here as applications are accepted.\n", "dim");
        return;
      }

      output(`ACCEPTED INTERNS (${peers.length} active peers):`, "success");
      output("--------------------------------------------------------------------------------", "dim");
      output(` #  NAME                             EMAIL                         POINTS  STATUS`, "dim");
      output("--------------------------------------------------------------------------------", "dim");

      peers.forEach((peer: any, idx: number) => {
        const num = String(idx + 1).padEnd(2);
        const name = String(peer.studentName || peer.name || 'Intern').padEnd(32).slice(0, 32);
        const email = String(peer.studentEmail || peer.email || 'N/A').padEnd(28).slice(0, 28);
        const points = String(peer.totalPoints || 0).padStart(6);
        const status = (peer.status || 'Active').padEnd(7);

        output(` ${num} ${name} ${email} ${points}  ${status}`, "default");
      });

      output("--------------------------------------------------------------------------------", "dim");
      output(`[INFO] Bluetooth Chat: Ready for peer-to-peer connection with supervisor admin`, "dim");
      output("", "default");

    } catch (error: any) {
      output(`[ERROR] ${error.message}`, "error");
    }
  },
};

export const cohortsCommand: ZilaCommand = {
  name: "cohorts",
  aliases: ["sessions", "programs-list"],
  description: "Browse and manage your enrolled cohorts",
  usage: "cohorts [--all]",
  category: "cohort",
  available: true,
  handler: async (args, output) => {
    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("[AUTH] Not authenticated. Run 'zila auth' to login.", "error");
      return;
    }

    try {
      output("[FETCH] Loading cohorts...", "info");

      const res = await fetch(`${API_BASE_URL}/api/cohorts/my-cohorts`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!res.ok) {
        output(`[ERROR] Failed to fetch cohorts (HTTP ${res.status})`, "error");
        return;
      }

      const { cohorts } = await res.json() as { cohorts: any[] };

      if (!cohorts || cohorts.length === 0) {
        output("\n[NOTICE] You have not been placed in an active cohort yet.", "warning");
        output("Check your accepted applications on the Zigex web dashboard.\n", "dim");
        return;
      }

      output("", "default");
      output("YOUR ENROLLED COHORTS:", "success");
      output("--------------------------------------------------------------------------------", "dim");

      cohorts.forEach((cohort: any, idx: number) => {
        const supInfo = cohort.supervisorName ? `Supervisor: ${cohort.supervisorName}` : "Supervisor: Unassigned";
        output(`[${idx + 1}] ${cohort.name}`, "info");
        output(`    Track: ${cohort.department} | ${supInfo}`, "dim");
        output(`    ID: ${cohort.id} | Status: ${cohort.enrollmentStatus || 'Active'}`, "dim");
        if (cohort.githubRepoUrl) {
          output(`    Repository: ${cohort.githubRepoUrl}`, "dim");
        }
        output("", "default");
      });

      output("[HINT] Type 'zila group' to see your fellow interns.", "dim");

    } catch (error: any) {
      output(`[ERROR] ${error.message}`, "error");
    }
  },
};

export const joinCohortCommand: ZilaCommand = {
  name: "join",
  aliases: ["enroll", "register-cohort"],
  description: "Join an open cohort by ID",
  usage: "join <cohort-id>",
  category: "cohort",
  available: true,
  handler: async (args, output) => {
    if (args.length === 0) {
      output("Usage: zila join <cohort-id>", "warning");
      output("Find cohort IDs with: zila cohorts --all", "dim");
      return;
    }

    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("[AUTH] Not authenticated. Run 'zila auth' first.", "error");
      return;
    }

    const cohortId = args[0];

    try {
      output(`[JOIN] Enrolling in cohort ${cohortId}...`, "info");

      const response = await fetch(`${API_BASE_URL}/api/cohorts/${cohortId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json() as { error?: string; message?: string };

      if (!response.ok) {
        output(`[ERROR] ${data.error || "Failed to join cohort"}`, "error");
        return;
      }

      output(`[SUCCESS] ${data.message || 'Successfully joined cohort!'}`, "success");
      output("Type 'zila group' to view your fellow interns.", "dim");

    } catch (error: any) {
      output(`[ERROR] ${error.message}`, "error");
    }
  },
};

