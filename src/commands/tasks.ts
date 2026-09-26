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
   output("[WARN] Not authenticated. Run zila auth first.", "error");
   return;
  }

  try {
   output("[SEARCH] Fetching your tasks...", "info");

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
    output("[ERROR] Failed to fetch tasks", "error");
    return;
   }

   const data = await response.json() as { tasks: any[] };
   const { tasks } = data;

   if (tasks.length === 0) {
    output("\n[EMPTY] No tasks assigned yet.", "warning");
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
   output("╭──────────── [CHART] Task Summary ────────────╮", "info");
   output(`│ [OK] Completed:   ${completed.length.toString().padStart(3)}        │`, "success");
   output(`│ [TASK] Pending:    ${pending.length.toString().padStart(3)}        │`, "warning");
   output(`│ [REVIEW] Under Review:  ${submitted.length.toString().padStart(3)}        │`, "info");
   if (overdue.length > 0) {
    output(`│ [WARN] Overdue:    ${overdue.length.toString().padStart(3)}        │`, "error");
   }
   output("╰─────────────────────────────────────────╯", "info");
   output("", "default");

   // Display overdue tasks first
   if (overdue.length > 0) {
    output("\n[ALERT] Overdue Tasks:\n", "error");
    overdue.forEach((task: any) => {
     displayTask(task, output, true);
    });
   }

   // Display pending tasks
   if (pending.length > 0) {
    output("\n[TASK] Pending Tasks:\n", "info");
    pending.slice(0, 5).forEach((task: any) => {
     displayTask(task, output);
    });
    if (pending.length > 5) {
     output(`  ... and ${pending.length - 5} more\n`, "dim");
    }
   }

   // Display submitted tasks
   if (submitted.length > 0) {
    output("\n[REVIEW] Under Review:\n", "info");
    submitted.slice(0, 3).forEach((task: any) => {
     displayTask(task, output);
    });
   }

   output("\n[TIP] Commands:", "info");
   output("  zila submit-task <task-id> - Submit a task", "dim");
   output("  zila task-details <task-id> - View task details", "dim");

  } catch (error: any) {
   output(`[ERROR] Error: ${error.message}`, "error");
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
   output("[WARN] Not authenticated. Run zila auth first.", "error");
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
    output("[ERROR] Task not found", "error");
    return;
   }

   const data = await response.json() as { task: any };
   const { task } = data;

   // Display task details
   output(`\n[LIST] ${task.title}`, "success");
   output(`  Type: ${task.type} • Difficulty: ${getDifficultyEmoji(task.difficulty)} ${task.difficulty}`, "dim");
   output(`  Points: * ${task.maxPoints}`, "dim");

   if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    const isOverdue = dueDate < new Date();
    const dueDateStr = dueDate.toLocaleDateString();
    output(`  Due: ${isOverdue ? "[ALERT]" : "[DATE]"} ${dueDateStr}`, isOverdue ? "error" : "dim");
   }

   output(`\n[TASK] Description:`, "info");
   output(`  ${task.description}\n`, "dim");

   if (task.skills.length > 0) {
    output(`[SKILLS] Skills: ${task.skills.join(", ")}`, "dim");
   }

   if (task.githubRequired) {
    output("  [LINK] GitHub repository required", "info");
   }

   if (task.prRequired) {
    output("  [PR] Pull request required", "info");
   }

   output(`\n[SUPERVISOR] Assigned by: ${task.assignedByName}`, "dim");

   // Show submission if exists
   const mySubmission = task.submissions?.find((s: any) => s.status !== "draft");
   if (mySubmission) {
    output("\n[SENT] Your Submission:", "success");
    output(`  Status: ${getStatusEmoji(mySubmission.status)} ${mySubmission.status}`, "dim");

    if (mySubmission.pointsEarned) {
     output(`  Score: * ${mySubmission.pointsEarned}/${task.maxPoints}`, "dim");
    }

    if (mySubmission.feedback) {
     output(`\n[CHAT] Feedback:`, "info");
     output(`  ${mySubmission.feedback}`, "dim");
    }
   } else {
    output("\n[EMPTY] Not yet submitted", "warning");
    output(`\n[TIP] Use zila submit-task ${taskId} to submit your work`, "info");
   }

  } catch (error: any) {
   output(`[ERROR] Error: ${error.message}`, "error");
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
  output("[APP] Opening task submission interface...", "info");
  shellContext.startSubmitTask?.();
 },
};

// Helper functions
function displayTask(task: any, output: any, isOverdue = false) {
 const difficultyEmoji = getDifficultyEmoji(task.difficulty);
 const statusEmoji = getStatusEmoji(task.submissionStatus);

 output(`${statusEmoji} ${task.title}`, isOverdue ? "error" : "success");
 output(`  ${task.cohort.name}`, "dim");
 output(`  ${difficultyEmoji} ${task.difficulty} • * ${task.maxPoints} pts • [PKG] ${task.type}`, "dim");

 if (task.dueDate) {
  const dueDate = new Date(task.dueDate);
  const dueDateStr = dueDate.toLocaleDateString();
  const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) {
   output(`  [ALERT] Overdue by ${Math.abs(daysUntil)} days`, "error");
  } else if (daysUntil <= 2) {
   output(`  [WARN] Due in ${daysUntil} days (${dueDateStr})`, "warning");
  } else {
   output(`  [DATE] Due ${dueDateStr}`, "dim");
  }
 }

 if (task.mySubmission) {
  if (task.mySubmission.pointsEarned) {
   output(`  [OK] Scored: ${task.mySubmission.pointsEarned}/${task.maxPoints}`, "success");
  }
 }

 output(`  [ID] ${task.id}\n`, "dim");
}

function getDifficultyEmoji(difficulty: string): string {
 switch (difficulty) {
  case "easy": return "[EASY]";
  case "medium": return "[MED]";
  case "hard": return "[HARD]";
  default: return "[DIFF]";
 }
}

function getStatusEmoji(status: string): string {
 switch (status) {
  case "not_submitted": return "[EMPTY]";
  case "draft": return "[TASK]";
  case "submitted": return "[SENT]";
  case "under_review": return "[REVIEW]";
  case "approved": return "[OK]";
  case "rejected": return "[ERROR]";
  case "needs_revision": return "[TOOL]";
  default: return "[LIST]";
 }
}
