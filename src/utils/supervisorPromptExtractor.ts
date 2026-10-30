export interface ExtractedSupervisorPrompt {
  hasInstructions: boolean;
  rawHeader: string;
  title?: string;
  taskDescription?: string;
  requirements: string[];
  weight: number;
}

/**
 * Extracts supervisor instructions from the top comment of an exercise file.
 * Supports python docstrings (""" ... """), C-style block comments (/* ... *\/),
 * and shell/python comments (# ...).
 */
export function extractSupervisorInstructions(fileContent: string): ExtractedSupervisorPrompt {
  if (!fileContent || fileContent.trim().length === 0) {
    return { hasInstructions: false, rawHeader: "", requirements: [], weight: 1.0 };
  }

  // Check for multi-line block comment at start of file
  const blockRegex = /^(?:"""|'''|\/\*|<!--)([\s\S]*?)(?:"""|'''|\*\/|-->)/;
  const match = fileContent.trimStart().match(blockRegex);

  let commentBlock = "";
  if (match) {
    commentBlock = match[1] || "";
  } else {
    // Check for consecutive lines starting with # or //
    const lines = fileContent.split("\n");
    const headerLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed.startsWith("//")) {
        headerLines.push(trimmed.replace(/^(\/\/|#)\s?/, ""));
      } else if (trimmed === "") {
        continue;
      } else {
        break;
      }
    }
    commentBlock = headerLines.join("\n");
  }

  if (!commentBlock || commentBlock.trim().length === 0) {
    return { hasInstructions: false, rawHeader: "", requirements: [], weight: 1.0 };
  }

  // Parse requirements, weight, and task
  const requirements: string[] = [];
  let weight = 1.0;
  let taskDescription: string | undefined;
  let title: string | undefined;

  const lines = commentBlock.split("\n");
  let inRequirementsSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/weight:\s*([0-9.]+)/i.test(trimmed)) {
      const m = trimmed.match(/weight:\s*([0-9.]+)/i);
      if (m && m[1]) weight = parseFloat(m[1]);
    }

    if (/task:\s*(.+)/i.test(trimmed)) {
      const m = trimmed.match(/task:\s*(.+)/i);
      if (m && m[1]) taskDescription = m[1].trim();
    }

    if (/title:\s*(.+)/i.test(trimmed)) {
      const m = trimmed.match(/title:\s*(.+)/i);
      if (m && m[1]) title = m[1].trim();
    }

    if (/requirements?:/i.test(trimmed)) {
      inRequirementsSection = true;
      continue;
    }

    if (inRequirementsSection) {
      if (/^[0-9]+[.)]\s*(.+)/.test(trimmed)) {
        const item = trimmed.replace(/^[0-9]+[.)]\s*/, "");
        requirements.push(item);
      } else if (/^[-*]\s*(.+)/.test(trimmed)) {
        const item = trimmed.replace(/^[-*]\s*/, "");
        requirements.push(item);
      } else if (trimmed.includes(":") && !trimmed.startsWith("-")) {
        // Exit requirements if another section starts
        inRequirementsSection = false;
      }
    }
  }

  return {
    hasInstructions: true,
    rawHeader: commentBlock.trim(),
    title,
    taskDescription,
    requirements,
    weight,
  };
}

/**
 * Known dedicated supervisor instruction file names.
 * These are files placed in an exercise folder specifically for the agent to read.
 */
export const SUPERVISOR_INSTRUCTION_FILES = [
  ".supervisor_instructions",
  "supervisor_instructions.json",
  ".instructions.md",
  "instructions.md",
  ".supervisor/instructions.md",
  ".zila_instructions.json",
  ".zila_rubric.json",
  "supervisor_prompt.txt",
];

import fs from "node:fs";
import path from "node:path";

/**
 * Searches an exercise directory for supervisor instructions:
 * 1. Checks dedicated instruction files (hidden or supervisor-specific).
 * 2. Checks code files in the directory for top-level supervisor docstrings/comments.
 * 3. Falls back gracefully with empty instructions if none found.
 */
export function findSupervisorInstructionsInFolder(folderPath: string): ExtractedSupervisorPrompt {
  if (!fs.existsSync(folderPath)) {
    return { hasInstructions: false, rawHeader: "", requirements: [], weight: 1.0 };
  }

  // 1. Check dedicated supervisor instruction files first
  for (const filename of SUPERVISOR_INSTRUCTION_FILES) {
    const filePath = path.join(folderPath, filename);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf8").trim();
        if (filename.endsWith(".json") || content.startsWith("{")) {
          const parsed = JSON.parse(content);
          return {
            hasInstructions: true,
            rawHeader: content,
            title: parsed.title || parsed.task,
            taskDescription: parsed.taskDescription || parsed.description || parsed.task,
            requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
            weight: typeof parsed.weight === "number" ? parsed.weight : (typeof parsed.gradingWeight === "number" ? parsed.gradingWeight : 1.0),
          };
        }

        // Markdown or plain text
        const extracted = extractSupervisorInstructions(content);
        if (extracted.hasInstructions && extracted.requirements.length > 0) {
          return extracted;
        }

        // If simple markdown bullets without docstring markers
        const lines = content.split("\n").map((l) => l.trim());
        const reqs = lines
          .filter((l) => l.startsWith("- ") || l.startsWith("* ") || /^\d+\.\s/.test(l))
          .map((l) => l.replace(/^[-*]\s+|\d+\.\s+/, ""));

        if (reqs.length > 0) {
          return {
            hasInstructions: true,
            rawHeader: content,
            title: lines.find((l) => l.startsWith("# "))?.replace(/^#\s+/, ""),
            taskDescription: content.slice(0, 300),
            requirements: reqs,
            weight: 1.0,
          };
        }
      } catch {
        // continue to next file
      }
    }
  }

  // 2. Check code files in the folder for docstrings / header comments
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    // Sort prioritized files first: exercise.*, task.*, main.*
    const sorted = entries
      .filter((e) => e.isFile())
      .sort((a, b) => {
        const aPri = /^(?:exercise|task|main|solution)/i.test(a.name) ? -1 : 1;
        const bPri = /^(?:exercise|task|main|solution)/i.test(b.name) ? -1 : 1;
        return aPri - bPri;
      });

    for (const entry of sorted) {
      if (entry.name === "exercise.md") continue; // Skip student submission markdown
      const ext = path.extname(entry.name).toLowerCase();
      if ([".py", ".ts", ".js", ".c", ".cpp", ".rs", ".go", ".html", ".sh"].includes(ext)) {
        const fullPath = path.join(folderPath, entry.name);
        const codeContent = fs.readFileSync(fullPath, "utf8");
        const extracted = extractSupervisorInstructions(codeContent);
        if (extracted.hasInstructions && extracted.requirements.length > 0) {
          return extracted;
        }
      }
    }
  } catch {
    // Non-fatal
  }

  return { hasInstructions: false, rawHeader: "", requirements: [], weight: 1.0 };
}

