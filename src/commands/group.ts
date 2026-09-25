import type { ZilaCommand } from "./registry.js";
import { loadAuth } from "../utils/auth.js";
import { env } from "process";

const API_BASE_URL = env.ZILA_API_URL || "http://localhost:5000";

export const groupCommand: ZilaCommand = {
  name: "group",
  aliases: ["peers", "colleagues", "cohort-members"],
  description: "View your peers/colleagues in the same cohort",
  usage: "group [cohort-id]",
  category: "cohort",
  available: true,
  handler: async (args, output) => {
    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("⚠️  Not authenticated. Run  zila auth  first.", "error");
      return;
    }

    try {
      output("🔍 Fetching your cohorts...", "info");

      // First, get user's cohorts
      const cohortsResponse = await fetch(`${API_BASE_URL}/api/cohorts/my-cohorts`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!cohortsResponse.ok) {
        output("❌ Failed to fetch your cohorts", "error");
        return;
      }

      const cohortsData = await cohortsResponse.json() as { cohorts: any[] };
      const { cohorts } = cohortsData;

      if (cohorts.length === 0) {
        output("📭 You are not enrolled in any cohorts yet.", "warning");
        output("Use  zila cohorts  to browse and join available cohorts.", "dim");
        return;
      }

      // If cohort-id provided, show peers for that cohort
      const cohortId = args[0] || cohorts[0].id;

      const selectedCohort = cohorts.find((c: any) => c.id === cohortId) || cohorts[0];

      output(``, "default");
      output(`╭─────────────────────────────────────────────────────────╮`, "info");
      output(`│  📚 ${selectedCohort.name.padEnd(50)} │`, "success");
      output(`│  ${selectedCohort.department} • ${selectedCohort.level.padEnd(46)} │`, "dim");
      output(`╰─────────────────────────────────────────────────────────╯`, "info");
      output(``, "default");

      // Fetch peers
      const peersResponse = await fetch(`${API_BASE_URL}/api/cohorts/${selectedCohort.id}/peers`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!peersResponse.ok) {
        output("❌ Failed to fetch peers", "error");
        return;
      }

      const peersData = await peersResponse.json() as { peers: any[]; totalPeers: number };
      const { peers, totalPeers } = peersData;

      if (peers.length === 0) {
        output("", "default");
        output("   👤 You're the only one in this cohort so far!", "info");
        output("   💡 More students will join soon!", "dim");
        return;
      }

      output(`👥 Your Colleagues (${totalPeers} total)`, "success");
      output(`${"─".repeat(60)}`, "dim");
      output(``, "default");

      // Display peers in a nice format with better styling
      peers.forEach((peer: any, index: number) => {
        const rank = index + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "   ";

        output(`${medal} ${peer.studentName}`, "success");
        output(`     📧 ${peer.studentEmail}`, "dim");
        output(`     ⭐ ${peer.totalPoints} points`, "info");

        const joinDate = new Date(peer.joinedAt).toLocaleDateString();
        output(`     📅 Joined ${joinDate}`, "dim");
        output(``, "default");
      });

      // Show other cohorts if multiple
      if (cohorts.length > 1) {
        output("\n💡 You're in multiple cohorts. Use  zila group <cohort-id>  to switch.", "dim");
      }

    } catch (error: any) {
      output(`❌ Error: ${error.message}`, "error");
    }
  },
};

export const cohortsCommand: ZilaCommand = {
  name: "cohorts",
  aliases: ["sessions", "programs-list"],
  description: "Browse and manage your cohorts",
  usage: "cohorts [--active | --all]",
  category: "cohort",
  available: true,
  handler: async (args, output) => {
    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("⚠️  Not authenticated. Run  zila auth  first.", "error");
      return;
    }

    try {
      const showAll = args.includes("--all");

      // Fetch user's cohorts
      output("🔍 Fetching your cohorts...", "info");

      const myCohortsResponse = await fetch(`${API_BASE_URL}/api/cohorts/my-cohorts`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!myCohortsResponse.ok) {
        output("❌ Failed to fetch cohorts", "error");
        return;
      }

      const myCohortsData = await myCohortsResponse.json() as { cohorts: any[] };
      const { cohorts: myCohorts } = myCohortsData;

      if (myCohorts.length === 0) {
        output("\n📭 You are not enrolled in any cohorts yet.", "warning");

        // Show available cohorts
        if (showAll) {
          output("\n🌟 Available Cohorts:\n", "info");

          const allCohortsResponse = await fetch(`${API_BASE_URL}/api/cohorts?active=true`, {
            headers: {
              Authorization: `Bearer ${authRecord.token}`,
            },
          });

          if (allCohortsResponse.ok) {
            const data = await allCohortsResponse.json() as { cohorts: any[] };
            const { cohorts: availableCohorts } = data;

            availableCohorts.forEach((cohort: any) => {
              output(`📚 ${cohort.name}`, "success");
              output(`   ${cohort.department} • ${cohort.level}`, "dim");
              output(`   👥 ${cohort._count.students} students`, "dim");
              output(`   📝 ${cohort._count.tasks} tasks`, "dim");
              output(`   🆔 ${cohort.id}\n`, "dim");
            });

            output("💡 Use  zila join <cohort-id>  to enroll in a cohort.", "info");
          }
        }

        return;
      }

      output("\n📚 Your Cohorts:\n", "success");

      myCohorts.forEach((cohort: any) => {
        const statusEmoji = cohort.isActive ? "✅" : "⏸️";
        const enrollmentEmoji = cohort.enrollmentStatus === "active" ? "🎓" : "📝";

        output(`${statusEmoji} ${enrollmentEmoji} ${cohort.name}`, "success");
        output(`   ${cohort.department} • ${cohort.level}`, "dim");
        output(`   👥 ${cohort._count.students} students • 📝 ${cohort._count.tasks} tasks`, "dim");

        const startDate = new Date(cohort.startDate).toLocaleDateString();
        const endDate = new Date(cohort.endDate).toLocaleDateString();
        output(`   📅 ${startDate} → ${endDate}`, "dim");
        output(`   🆔 ${cohort.id}\n`, "dim");
      });

      output("\n💡 Commands:", "info");
      output("   zila group [cohort-id]  - View peers in a cohort", "dim");
      output("   zila tasks [cohort-id]  - View tasks for a cohort", "dim");

    } catch (error: any) {
      output(`❌ Error: ${error.message}`, "error");
    }
  },
};

export const joinCohortCommand: ZilaCommand = {
  name: "join",
  aliases: ["enroll", "register-cohort"],
  description: "Join a cohort",
  usage: "join <cohort-id>",
  category: "cohort",
  available: true,
  handler: async (args, output) => {
    if (args.length === 0) {
      output("Usage: zila join <cohort-id>", "warning");
      output("Find cohort IDs with:  zila cohorts --all", "dim");
      return;
    }

    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("⚠️  Not authenticated. Run  zila auth  first.", "error");
      return;
    }

    const cohortId = args[0];

    try {
      output(`🔄 Joining cohort...`, "info");

      const response = await fetch(`${API_BASE_URL}/api/cohorts/${cohortId}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json() as { error?: string; message?: string };

      if (!response.ok) {
        output(`❌ ${data.error || "Failed to join cohort"}`, "error");
        return;
      }

      output(`✅ ${data.message}`, "success");
      output("\n💡 Next steps:", "info");
      output("   zila group       - See your peers", "dim");
      output("   zila tasks       - View assigned tasks", "dim");
      output("   zila docs        - Browse learning materials", "dim");

    } catch (error: any) {
      output(`❌ Error: ${error.message}`, "error");
    }
  },
};
