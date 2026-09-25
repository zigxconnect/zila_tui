import type { ZilaCommand } from "./registry.js";
import { loadAuth } from "../utils/auth.js";
import { env } from "process";

const API_BASE_URL = env.ZILA_API_URL || "http://localhost:5000";

export const tasksCommand: ZilaCommand = {
  name: "tasks",
  aliases: ["assignments", "work"],
  description: "View your assigned tasks",
  usage: "tasks [--cohort <cohort-id>] [--status <status>]",
  category: "tasks",
  available: true,
  handler: async (args, output) => {
    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("⚠️  Not authenticated. Run  zila auth  first.", "error");
      return;
    }

    try {
      output("🔍 Fetching your tasks...", "info");

      // Parse arguments
      const cohortIdIndex = args.indexOf("--cohort");
      const cohortId = cohortIdIndex !== -1 ? args[cohortIdIndex + 1] : undefined;

      const queryParams = new URLSearchParams();
      if (cohortId) queryParams.set("cohortId", cohortId);

      const response = await fetch(`${API_BASE_URL}/api/tasks/my-tasks?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!response.ok) {
        output("❌ Failed to fetch tasks", "error");
        return;
      }

      const data = await response.json() as { tasks: any[] };
      const { tasks } = data;

      if (tasks.length === 0) {
        output("\n📭 No tasks assigned yet.", "warning");
        return;
      }

      // Group tasks by status
      const pending = tasks.filter((t: any) => t.submissionStatus === "not_submitted");
      const submitted = tasks.filter((t: any) =>
        ["submitted", "under_review"].includes(t.submissionStatus)
      );
      const completed = tasks.filter((t: any) => t.submissionStatus === "approved");
      const overdue = tasks.filter((t: any) => t.isOverdue);

      // Display statistics with beautiful formatting
      output("", "default");
      output("╭──────────── 📊 Task Summary ────────────╮", "info");
      output(`│  ✅ Completed:      ${completed.length.toString().padStart(3)}               │`, "success");
      output(`│  📝 Pending:        ${pending.length.toString().padStart(3)}               │`, "warning");
      output(`│  🔄 Under Review:   ${submitted.length.toString().padStart(3)}               │`, "info");
      if (overdue.length > 0) {
        output(`│  ⚠️  Overdue:        ${overdue.length.toString().padStart(3)}               │`, "error");
      }
      output("╰─────────────────────────────────────────╯", "info");
      output("", "default");

      // Display overdue tasks first
      if (overdue.length > 0) {
        output("\n🚨 Overdue Tasks:\n", "error");
        overdue.forEach((task: any) => {
          displayTask(task, output, true);
        });
      }

      // Display pending tasks
      if (pending.length > 0) {
        output("\n📝 Pending Tasks:\n", "info");
        pending.slice(0, 5).forEach((task: any) => {
          displayTask(task, output);
        });
        if (pending.length > 5) {
          output(`   ... and ${pending.length - 5} more\n`, "dim");
        }
      }

      // Display submitted tasks
      if (submitted.length > 0) {
        output("\n🔄 Under Review:\n", "info");
        submitted.slice(0, 3).forEach((task: any) => {
          displayTask(task, output);
        });
      }

      output("\n💡 Commands:", "info");
      output("   zila submit-task <task-id>  - Submit a task", "dim");
      output("   zila task-details <task-id> - View task details", "dim");

    } catch (error: any) {
      output(`❌ Error: ${error.message}`, "error");
    }
  },
};

export const taskDetailsCommand: ZilaCommand = {
  name: "task-details",
  aliases: ["task", "view-task"],
  description: "View detailed information about a task",
  usage: "task-details <task-id>",
  category: "tasks",
  available: true,
  handler: async (args, output) => {
    if (args.length === 0) {
      output("Usage: zila task-details <task-id>", "warning");
      return;
    }

    const authRecord = loadAuth();
    if (!authRecord?.token) {
      output("⚠️  Not authenticated. Run  zila auth  first.", "error");
      return;
    }

    const taskId = args[0];

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${authRecord.token}`,
        },
      });

      if (!response.ok) {
        output("❌ Task not found", "error");
        return;
      }

      const data = await response.json() as { task: any };
      const { task } = data;

      // Display task details
      output(`\n📋 ${task.title}`, "success");
      output(`   Type: ${task.type} • Difficulty: ${getDifficultyEmoji(task.difficulty)} ${task.difficulty}`, "dim");
      output(`   Points: ⭐ ${task.maxPoints}`, "dim");

      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        const isOverdue = dueDate < new Date();
        const dueDateStr = dueDate.toLocaleDateString();
        output(`   Due: ${isOverdue ? "🚨" : "📅"} ${dueDateStr}`, isOverdue ? "error" : "dim");
      }

      output(`\n📝 Description:`, "info");
      output(`   ${task.description}\n`, "dim");

      if (task.skills.length > 0) {
        output(`🎯 Skills: ${task.skills.join(", ")}`, "dim");
      }

      if (task.githubRequired) {
        output("   🔗 GitHub repository required", "info");
      }

      if (task.prRequired) {
        output("   🔀 Pull request required", "info");
      }

      output(`\n👨‍🏫 Assigned by: ${task.assignedByName}`, "dim");

      // Show submission if exists
      const mySubmission = task.submissions?.find((s: any) => s.status !== "draft");
      if (mySubmission) {
        output("\n📤 Your Submission:", "success");
        output(`   Status: ${getStatusEmoji(mySubmission.status)} ${mySubmission.status}`, "dim");

        if (mySubmission.pointsEarned) {
          output(`   Score: ⭐ ${mySubmission.pointsEarned}/${task.maxPoints}`, "dim");
        }

        if (mySubmission.feedback) {
          output(`\n💬 Feedback:`, "info");
          output(`   ${mySubmission.feedback}`, "dim");
        }
      } else {
        output("\n📭 Not yet submitted", "warning");
        output(`\n💡 Use  zila submit-task ${taskId}  to submit your work`, "info");
      }

    } catch (error: any) {
      output(`❌ Error: ${error.message}`, "error");
    }
  },
};

export const submitTaskCommand2: ZilaCommand = {
  name: "submit-task-full",
  aliases: ["submit-work"],
  description: "Submit a task solution",
  usage: "submit-task-full <task-id>",
  category: "tasks",
  available: true,
  handler: async (args, output, shellContext) => {
    if (args.length === 0) {
      output("Usage: zila submit-task-full <task-id>", "warning");
      return;
    }

    // For now, redirect to the interactive submit task screen
    // This will be enhanced with the interactive UI
    output("🚀 Opening task submission interface...", "info");
    shellContext.startSubmitTask?.();
  },
};

// Helper functions
function displayTask(task: any, output: any, isOverdue = false) {
  const difficultyEmoji = getDifficultyEmoji(task.difficulty);
  const statusEmoji = getStatusEmoji(task.submissionStatus);

  output(`${statusEmoji} ${task.title}`, isOverdue ? "error" : "success");
  output(`   ${task.cohort.name}`, "dim");
  output(`   ${difficultyEmoji} ${task.difficulty} • ⭐ ${task.maxPoints} pts • 📦 ${task.type}`, "dim");

  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const dueDateStr = dueDate.toLocaleDateString();
    const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      output(`   🚨 Overdue by ${Math.abs(daysUntil)} days`, "error");
    } else if (daysUntil <= 2) {
      output(`   ⚠️  Due in ${daysUntil} days (${dueDateStr})`, "warning");
    } else {
      output(`   📅 Due ${dueDateStr}`, "dim");
    }
  }

  if (task.mySubmission) {
    if (task.mySubmission.pointsEarned) {
      output(`   ✅ Scored: ${task.mySubmission.pointsEarned}/${task.maxPoints}`, "success");
    }
  }

  output(`   🆔 ${task.id}\n`, "dim");
}

function getDifficultyEmoji(difficulty: string): string {
  switch (difficulty) {
    case "easy": return "🟢";
    case "medium": return "🟡";
    case "hard": return "🔴";
    default: return "⚪";
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case "not_submitted": return "📭";
    case "draft": return "📝";
    case "submitted": return "📤";
    case "under_review": return "🔄";
    case "approved": return "✅";
    case "rejected": return "❌";
    case "needs_revision": return "🔧";
    default: return "📋";
  }
}
