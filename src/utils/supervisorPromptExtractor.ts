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
