import type { ZilaCommand, ShellContext } from "./registry.js";
import { loadAuth } from "../utils/auth.js";
import { ClientCache } from "../utils/cache.js";
import { env } from "process";

const API_BASE_URL = env.ZILA_API_URL || "http://localhost:5000";

export interface GroupArguments {
  cohortId?: string;
  refresh: boolean;
  error?: string;
}

export function parseGroupArguments(args: string[]): GroupArguments {
  let cohortId: string | undefined;
  let refresh = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === "--refresh" || arg === "-r") {
      refresh = true;
      continue;
    }

    if (arg === "--cohort" || arg === "-c") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        return { refresh, error: "Missing cohort ID after --cohort." };
      }
      if (cohortId) return { refresh, error: "Specify only one cohort ID." };
      cohortId = value;
      index++;
      continue;
    }

    if (arg.startsWith("--cohort=")) {
      const value = arg.slice("--cohort=".length);
      if (!value) return { refresh, error: "Missing cohort ID after --cohort=." };
      if (cohortId) return { refresh, error: "Specify only one cohort ID." };
      cohortId = value;
      continue;
    }

    if (arg.startsWith("-")) {
      return { refresh, error: `Unknown group option: ${arg}` };
    }
    if (cohortId) return { refresh, error: "Specify only one cohort ID." };
    cohortId = arg;
  }

  return { cohortId, refresh };
}

export const groupCommand: ZilaCommand = {
  name: "group",
  aliases: ["peers", "colleagues", "cohort-members"],
  description: "View your fellow accepted interns and supervisor in your cohort",
  usage: "group [--cohort <id>] [--refresh]",
  category: "cohort",
  available: true,
  handler: async (args, output, shellContext: ShellContext) => {
    if (args.includes("--cohorts")) {
      if (args.length !== 1) {
        output("Usage: zila group --cohorts", "warning");
      } else if (shellContext.startCohortPicker) {
        shellContext.startCohortPicker("group");
      } else {
        output("Run 'zila cohorts' to list IDs, then 'zila group --cohort <ID>'.", "dim");
      }
      return;
    }

    const parsedArgs = parseGroupArguments(args);
    if (parsedArgs.error) {
      output(`[ERROR] ${parsedArgs.error}`, "error");
      output("Usage: zila group [--cohort <id>] [--refresh]", "dim");
      return;
    }

    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("[AUTH] Not authenticated. Run 'auth' to login.", "error");
      return;
    }

    const { refresh, cohortId: targetCohortId } = parsedArgs;
    const cacheKey = `group:${authRecord.email || "me"}:${targetCohortId || "default"}`;

    try {
      if (targetCohortId) {
        const cohortsCacheKey = `my-cohorts:${authRecord.email || "me"}`;
        let cohorts = refresh ? null : ClientCache.get<any[]>(cohortsCacheKey);
        if (!cohorts) {
          const cohortsResponse = await fetch(`${API_BASE_URL}/api/cohorts/my-cohorts`, {
            headers: { Authorization: `Bearer ${authRecord.token}` },
          });
          if (!cohortsResponse.ok) {
            output(`[ERROR] Failed to verify cohort membership (HTTP ${cohortsResponse.status})`, "error");
            return;
          }
          const cohortsData = await cohortsResponse.json() as { cohorts?: any[] };
          cohorts = cohortsData.cohorts ?? [];
          ClientCache.set(cohortsCacheKey, cohorts, 120);
        }
        if (!cohorts.some((cohort) => cohort.id === targetCohortId)) {
          output(`[ERROR] Cohort ${targetCohortId} is not in your enrolled cohorts.`, "error");
          output("Run 'zila cohorts --refresh' to see your available cohort IDs.", "dim");
          return;
        }
      }

      let data: any = null;
      if (!refresh) {
        data = ClientCache.get<any>(cacheKey);
      }

      if (data) {
        output("[CACHE • instant] Loaded cohort from local fast cache", "dim");
      } else {
        output("[FETCH] Loading your cohort members and placements...", "info");

        const targetUrl = targetCohortId
          ? `${API_BASE_URL}/api/cohorts/${encodeURIComponent(targetCohortId)}/chat-group`
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

        data = await res.json() as any;
        ClientCache.set(cacheKey, data, 120);
      }

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
      const currentEmail = authRecord.email.trim().toLowerCase();
      const peers = (data.peers || data.chatContext?.members || []).filter((peer: any) => {
        const peerEmail = String(peer.studentEmail || peer.email || "").trim().toLowerCase();
        return !currentEmail || peerEmail !== currentEmail;
      });

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
  usage: "cohorts [--refresh]",
  category: "cohort",
  available: true,
  handler: async (args, output) => {
    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("[AUTH] Not authenticated. Run 'auth' to login.", "error");
      return;
    }

    const refresh = args.includes("--refresh") || args.includes("-r");
    const cacheKey = `my-cohorts:${authRecord.email || "me"}`;

    try {
      let cohorts: any[] | null = null;
      if (!refresh) {
        cohorts = ClientCache.get<any[]>(cacheKey);
      }

      if (cohorts) {
        output("[CACHE • instant] Loaded cohorts from local fast cache", "dim");
      } else {
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

        const json = (await res.json()) as { cohorts: any[] };
        cohorts = json.cohorts || [];
        ClientCache.set(cacheKey, cohorts, 120);
      }

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
        output(`    Team: zila group --cohort ${cohort.id}`, "dim");
        if (cohort.githubRepoUrl) {
          output(`    Repository: ${cohort.githubRepoUrl}`, "dim");
        }
        output("", "default");
      });

      output("[HINT] Use 'zila group --cohort <ID>' to view a cohort's team; add --refresh for live data.", "dim");

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

