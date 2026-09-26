import type { ZilaCommand } from "./registry.js";
import { loadAuth } from "../utils/auth.js";
import { env } from "process";

const API_BASE_URL = env.ZILA_API_URL || "http://localhost:5000";

export const statsCommand: ZilaCommand = {
 name: "stats",
 aliases: ["points", "score", "progress"],
 description: "View your gamification stats and progress",
 usage: "stats",
 category: "gamification",
 available: true,
 handler: async (args, output) => {
  const authRecord = loadAuth();
  if (!authRecord?.token) {
   output("[WARN] Not authenticated. Run zila auth first.", "error");
   return;
  }

  try {
   output("[SEARCH] Fetching your stats...", "info");

   const response = await fetch(`${API_BASE_URL}/api/gamification/my-stats`, {
    headers: {
     Authorization: `Bearer ${authRecord.token}`,
    },
   });

   if (!response.ok) {
    output("[ERROR] Failed to fetch stats", "error");
    return;
   }

   const data = await response.json() as {
    totalPoints: number;
    pointsBreakdown: any;
    achievements: any[];
    recentScores: any[];
    enrollments: any[]
   };
   const { totalPoints, pointsBreakdown, achievements, recentScores, enrollments } = data;

   // Display total points with visual flair
   output("", "default");
   output("╔═══════════════════════════════════════════════════════╗", "success");
   output("║                            ║", "success");
   output(`║     * Your Progress Dashboard *        ║`, "success");
   output("║                            ║", "success");
   output("╠═══════════════════════════════════════════════════════╣", "success");
   output(`║   * Total Points: ${totalPoints.toString().padEnd(30)} ║`, "success");
   output("╚═══════════════════════════════════════════════════════╝", "success");
   output("", "default");

   // Points breakdown with better formatting
   if (Object.keys(pointsBreakdown).length > 0) {
    output("[CHART] Points Breakdown", "info");
    output("─".repeat(50), "dim");
    Object.entries(pointsBreakdown).forEach(([type, points]) => {
     const emoji = getPointTypeEmoji(type);
     const formattedType = formatPointType(type).padEnd(25);
     const bar = "█".repeat(Math.min(Math.floor((points as number) / 50), 20));
     output(`${emoji} ${formattedType} ${(points as number).toString().padStart(4)} pts ${bar}`, "dim");
    });
    output("", "default");
   }

   // Achievements
   if (achievements.length > 0) {
    output("\n[TOP] Achievements Unlocked:", "success");
    achievements.slice(0, 5).forEach((achievement: any) => {
     output(`  ${achievement.icon} ${achievement.name}`, "success");
     output(`   ${achievement.description}`, "dim");
    });
    if (achievements.length > 5) {
     output(`  ... and ${achievements.length - 5} more`, "dim");
    }
   } else {
    output("\n[TOP] No achievements yet. Keep working to unlock badges!", "dim");
   }

   // Recent weekly scores
   if (recentScores.length > 0) {
    output("\n[TREND] Recent Weekly Scores:", "info");
    recentScores.slice(0, 4).forEach((score: any) => {
     const scoreBar = createProgressBar(score.overallScore, 100, 20);
     output(`  Week ${score.weekNumber}: ${scoreBar} ${score.overallScore}%`, "dim");
    });
   }

   // Cohort breakdown
   if (enrollments.length > 0) {
    output("\n[DOC] Points by Cohort:", "info");
    enrollments.forEach((enrollment: any) => {
     output(`  ${enrollment.cohort.name}: ${enrollment.points} pts`, "dim");
    });
   }

   output("\n[TIP] Commands:", "info");
   output("  zila leaderboard  - See how you rank", "dim");
   output("  zila achievements  - View all achievements", "dim");

  } catch (error: any) {
   output(`[ERROR] Error: ${error.message}`, "error");
  }
 },
};

export const leaderboardCommand: ZilaCommand = {
 name: "leaderboard",
 aliases: ["rankings", "top"],
 description: "View the leaderboard for your cohort",
 usage: "leaderboard [cohort-id]",
 category: "gamification",
 available: true,
 handler: async (args, output) => {
  const authRecord = loadAuth();
  if (!authRecord?.token) {
   output("[WARN] Not authenticated. Run zila auth first.", "error");
   return;
  }

  try {
   // Get user's cohorts first
   const cohortsResponse = await fetch(`${API_BASE_URL}/api/cohorts/my-cohorts`, {
    headers: {
     Authorization: `Bearer ${authRecord.token}`,
    },
   });

   if (!cohortsResponse.ok) {
    output("[ERROR] Failed to fetch cohorts", "error");
    return;
   }

   const cohortsData = await cohortsResponse.json() as { cohorts: any[] };
   const { cohorts } = cohortsData;

   if (cohorts.length === 0) {
    output("[EMPTY] You are not enrolled in any cohorts yet.", "warning");
    return;
   }

   const cohortId = args[0] || cohorts[0].id;
   const selectedCohort = cohorts.find((c: any) => c.id === cohortId) || cohorts[0];

   output(`\n[TOP] Leaderboard: ${selectedCohort.name}\n`, "success");

   const response = await fetch(`${API_BASE_URL}/api/gamification/leaderboard/${selectedCohort.id}`, {
    headers: {
     Authorization: `Bearer ${authRecord.token}`,
    },
   });

   if (!response.ok) {
    output("[ERROR] Failed to fetch leaderboard", "error");
    return;
   }

   const data = await response.json() as { leaderboard: any[] };
   const { leaderboard } = data;

   if (leaderboard.length === 0) {
    output("[EMPTY] No rankings yet.", "warning");
    return;
   }

   // Display leaderboard
   leaderboard.forEach((entry: any, index: number) => {
    const rankEmoji = getRankEmoji(entry.rank);
    const isCurrentUser = entry.studentEmail === authRecord.email;
    const highlight = isCurrentUser ? "-> " : "  ";

    output(`${highlight}${rankEmoji} #${entry.rank} ${entry.studentName}`, isCurrentUser ? "success" : "dim");
    output(`   * ${entry.totalPoints} points • [CHART] ${entry.latestScore}% (latest)`, "dim");
   });

   output("\n[TIP] Keep earning points by completing tasks and submitting quality work!", "info");

  } catch (error: any) {
   output(`[ERROR] Error: ${error.message}`, "error");
  }
 },
};

export const achievementsCommand: ZilaCommand = {
 name: "achievements",
 aliases: ["badges", "unlocks"],
 description: "View all available achievements",
 usage: "achievements",
 category: "gamification",
 available: true,
 handler: async (args, output) => {
  const authRecord = loadAuth();
  if (!authRecord?.token) {
   output("[WARN] Not authenticated. Run zila auth first.", "error");
   return;
  }

  try {
   output("[SEARCH] Fetching achievements...", "info");

   const response = await fetch(`${API_BASE_URL}/api/gamification/achievements`, {
    headers: {
     Authorization: `Bearer ${authRecord.token}`,
    },
   });

   if (!response.ok) {
    output("[ERROR] Failed to fetch achievements", "error");
    return;
   }

   const data = await response.json() as { achievements: any[] };
   const { achievements } = data;

   if (achievements.length === 0) {
    output("\n[EMPTY] No achievements available yet.", "warning");
    return;
   }

   // Get user's unlocked achievements
   const statsResponse = await fetch(`${API_BASE_URL}/api/gamification/my-stats`, {
    headers: {
     Authorization: `Bearer ${authRecord.token}`,
    },
   });

   const unlockedIds = new Set();
   if (statsResponse.ok) {
    const data = await statsResponse.json() as { achievements: any[] };
    const { achievements: unlocked } = data;
    unlocked.forEach((a: any) => unlockedIds.add(a.id));
   }

   // Group by category
   const byCategory: Record<string, any[]> = {};
   achievements.forEach((achievement: any) => {
    if (!byCategory[achievement.category]) {
     byCategory[achievement.category] = [];
    }
    byCategory[achievement.category]!.push(achievement);
   });

   output("\n[TOP] Achievements:\n", "success");

   Object.entries(byCategory).forEach(([category, items]) => {
    output(`\n[DIR] ${category.toUpperCase()}`, "info");

    items.forEach((achievement: any) => {
     const isUnlocked = unlockedIds.has(achievement.id);
     const status = isUnlocked ? "[OK]" : "[LOCKED]";

     output(`  ${status} ${achievement.icon} ${achievement.name}`, isUnlocked ? "success" : "dim");
     output(`   ${achievement.description}`, "dim");
     output(`   Requires: ${achievement.pointsRequired} points\n`, "dim");
    });
   });

  } catch (error: any) {
   output(`[ERROR] Error: ${error.message}`, "error");
  }
 },
};

// Helper functions
function getPointTypeEmoji(type: string): string {
 const emojiMap: Record<string, string> = {
  task_completion: "[OK]",
  early_submission: "[FAST]",
  code_quality: "[PRO]",
  peer_help: "[PEER]",
  streak: "[STREAK]",
  achievement: "[TOP]",
 };
 return emojiMap[type] || "*";
}

function formatPointType(type: string): string {
 return type
  .split("_")
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(" ");
}

function createProgressBar(current: number, max: number, width: number): string {
 const percentage = Math.min(current / max, 1);
 const filled = Math.round(width * percentage);
 const empty = width - filled;
 return "█".repeat(filled) + "░".repeat(empty);
}

function getRankEmoji(rank: number): string {
 switch (rank) {
  case 1: return "[1st]";
  case 2: return "[2nd]";
  case 3: return "[3rd]";
  default: return " ";
 }
}
