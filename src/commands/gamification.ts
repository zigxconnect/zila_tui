import type { ZilaCommand } from "./registry.js";
import { loadAuth } from "../utils/auth.js";
import { env } from "process";

const API_BASE_URL = env.ZILA_API_URL || "http://localhost:5000";

export const statsCommand: ZilaCommand = {
  name: "stats",
  aliases: ["points", "score", "progress"],
  description: "View your gamification stats and performance",
  usage: "stats [--text]",
  category: "gamification",
  available: true,
  handler: async (args, output, shellContext) => {
    // If interactive shell is active and --text is not requested, launch rich screen
    if (!args.includes("--text") && !args.includes("-t") && shellContext?.startStats) {
      shellContext.startStats();
      return;
    }

    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("! Not authenticated with API. Run 'auth' first.", "warning");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/gamification/my-stats`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!response.ok) {
        output("! Failed to fetch gamification stats from API", "error");
        return;
      }

      const data = (await response.json()) as {
        totalPoints: number;
        pointsBreakdown: any;
        achievements: any[];
        recentScores: any[];
        enrollments: any[];
      };
      const { totalPoints, pointsBreakdown, achievements, recentScores } = data;

      output("─".repeat(72), "dim");
      output("lil-zila › intern performance & stats", "info");
      output("─".repeat(72), "dim");
      output(`Total Gamification Points: ${totalPoints} pts`, "success");
      output("─".repeat(72), "dim");

      // Points breakdown table
      if (pointsBreakdown && Object.keys(pointsBreakdown).length > 0) {
        output("CATEGORY                  POINTS      SHARE       STATUS", "info");
        output("─".repeat(72), "dim");

        Object.entries(pointsBreakdown).forEach(([type, points]) => {
          const formattedType = formatPointType(type).padEnd(24);
          const ptsStr = `${points} pts`.padEnd(12);
          const share = totalPoints > 0 ? `${Math.round(((points as number) / totalPoints) * 100)}%`.padEnd(12) : "0%".padEnd(12);
          output(`${formattedType}  ${ptsStr}${share}Verified`, "dim");
        });
        output("─".repeat(72), "dim");
      }

      // Recent weekly scores
      if (recentScores && recentScores.length > 0) {
        output("WEEKLY SPRINT REVIEW", "info");
        output("WEEK        SCORE     PROGRESS GAUGE          RATING", "info");
        output("─".repeat(72), "dim");
        recentScores.slice(0, 4).forEach((score: any) => {
          const weekStr = `Week 0${score.weekNumber}`.padEnd(12);
          const scoreStr = `${score.overallScore}%`.padEnd(10);
          const scoreBar = createProgressBar(score.overallScore, 100, 20).padEnd(24);
          const rating = score.overallScore >= 85 ? "Exemplary" : "Proficient";
          output(`${weekStr}${scoreStr}${scoreBar}${rating}`, "dim");
        });
        output("─".repeat(72), "dim");
      }

      // Unlocked summary
      const unlockedCount = achievements ? achievements.length : 0;
      output(`Badges Unlocked: ${unlockedCount} · Run 'achievements' for complete badge list`, "dim");
      output("─".repeat(72), "dim");
    } catch (error: any) {
      output(`! Error retrieving stats: ${error.message}`, "error");
    }
  },
};

export const leaderboardCommand: ZilaCommand = {
  name: "leaderboard",
  aliases: ["rankings", "top"],
  description: "View the leaderboard for your cohort",
  usage: "leaderboard [--text] [cohort-id]",
  category: "gamification",
  available: true,
  handler: async (args, output, shellContext) => {
    if (!args.includes("--text") && !args.includes("-t") && shellContext?.startLeaderboard) {
      shellContext.startLeaderboard();
      return;
    }

    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("! Not authenticated. Run 'auth' first.", "warning");
      return;
    }

    try {
      const cohortsResponse = await fetch(`${API_BASE_URL}/api/cohorts/my-cohorts`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!cohortsResponse.ok) {
        output("! Failed to fetch cohorts", "error");
        return;
      }

      const cohortsData = (await cohortsResponse.json()) as { cohorts: any[] };
      const { cohorts } = cohortsData;

      if (!cohorts || cohorts.length === 0) {
        output("! You are not enrolled in any cohorts yet.", "warning");
        return;
      }

      const targetArgs = args.filter((a) => !a.startsWith("-"));
      const cohortId = targetArgs[0] || cohorts[0].id;
      const selectedCohort = cohorts.find((c: any) => c.id === cohortId) || cohorts[0];

      const response = await fetch(`${API_BASE_URL}/api/gamification/leaderboard/${selectedCohort.id}`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!response.ok) {
        output("! Failed to fetch leaderboard", "error");
        return;
      }

      const data = (await response.json()) as { leaderboard: any[] };
      const { leaderboard } = data;

      output("─".repeat(72), "dim");
      output(`lil-zila › leaderboard · ${selectedCohort.name}`, "info");
      output("─".repeat(72), "dim");
      output("RANK  INTERN NAME               POINTS      LATEST SPRINT", "info");
      output("─".repeat(72), "dim");

      leaderboard.forEach((entry: any) => {
        const isCurrent = entry.studentEmail === authRecord.email;
        const rankStr = `#${entry.rank}`.padEnd(6);
        const nameStr = (isCurrent ? `› ${entry.studentName}` : `  ${entry.studentName}`).padEnd(26);
        const ptsStr = `${entry.totalPoints} pts`.padEnd(12);
        const scoreStr = `${entry.latestScore}%`;
        output(`${rankStr}${nameStr}${ptsStr}${scoreStr}`, isCurrent ? "success" : "dim");
      });

      output("─".repeat(72), "dim");
    } catch (error: any) {
      output(`! Error retrieving leaderboard: ${error.message}`, "error");
    }
  },
};

export const achievementsCommand: ZilaCommand = {
  name: "achievements",
  aliases: ["badges", "unlocks"],
  description: "View all cohort achievements and unlocked badges",
  usage: "achievements [--text]",
  category: "gamification",
  available: true,
  handler: async (args, output, shellContext) => {
    // If interactive shell is active and --text is not requested, launch rich screen
    if (!args.includes("--text") && !args.includes("-t") && shellContext?.startAchievements) {
      shellContext.startAchievements();
      return;
    }

    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("! Not authenticated. Run 'auth' first.", "warning");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/gamification/achievements`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!response.ok) {
        output("! Failed to fetch achievements", "error");
        return;
      }

      const data = (await response.json()) as { achievements: any[] };
      const { achievements } = data;

      // Get user's unlocked achievements
      const statsResponse = await fetch(`${API_BASE_URL}/api/gamification/my-stats`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      const unlockedIds = new Set<string>();
      if (statsResponse.ok) {
        const statsData = (await statsResponse.json()) as { achievements: any[] };
        statsData.achievements?.forEach((a: any) => unlockedIds.add(a.id));
      }

      output("─".repeat(72), "dim");
      output("lil-zila › achievements & badges", "info");
      output("─".repeat(72), "dim");
      output("STATUS      BADGE                 CATEGORY        REQUIREMENT / PTS", "info");
      output("─".repeat(72), "dim");

      achievements.forEach((achievement: any) => {
        const isUnlocked = unlockedIds.has(achievement.id);
        const statusStr = (isUnlocked ? "[UNLOCKED]" : "[LOCKED]").padEnd(12);
        const nameStr = achievement.name.padEnd(22);
        const catStr = (achievement.category || "General").padEnd(16);
        const reqStr = `${achievement.pointsRequired} pts`;

        output(`${statusStr}${nameStr}${catStr}${reqStr}`, isUnlocked ? "success" : "dim");
      });

      output("─".repeat(72), "dim");
      output("Type 'stats' to check current points or 'leaderboard' for cohort rank", "dim");
    } catch (error: any) {
      output(`! Error retrieving achievements: ${error.message}`, "error");
    }
  },
};

// Helper functions
function formatPointType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function createProgressBar(current: number, max: number, width: number): string {
  const percentage = Math.min(current / max, 1);
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}
