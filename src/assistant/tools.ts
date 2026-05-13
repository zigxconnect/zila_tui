import {
  getDirectoryTree,
  getRecentCommits,
  getUncommittedChanges,
  getLastDiff,
  getFileContent,
  readReadme,
  searchCode,
  getContributors,
} from "./gatherer.js";

export interface ToolDef {
  fn: (repoPath: string, args: Record<string, string>) => string;
  args: string[];
  desc: string;
}

export const TOOLS: Record<string, ToolDef> = {
  directory_tree: {
    fn: (r) => getDirectoryTree(r),
    args: [],
    desc: "Lists all tracked files grouped by directory. Use to understand project structure or discover what files exist.",
  },
  recent_commits: {
    fn: (r) => getRecentCommits(r),
    args: [],
    desc: "Returns the last 20 commits with author, date, message, and changed files. Use for history or recent activity questions.",
  },
  uncommitted_changes: {
    fn: (r) => getUncommittedChanges(r),
    args: [],
    desc: "Returns staged diffs, unstaged diffs, and untracked files. Use when asked about current work in progress.",
  },
  last_diff: {
    fn: (r) => getLastDiff(r),
    args: [],
    desc: "Returns the full patch of the most recent commit. Use when asked what the last commit changed.",
  },
  read_file: {
    fn: (r, args) => {
      const { filepath, start_line, end_line } = args;
      if (!filepath) return "Error: read_file requires a 'filepath' argument.";
      let content = getFileContent(r, filepath);
      if (start_line || end_line) {
        const lines = content.split("\n");
        const start = start_line ? Math.max(0, parseInt(start_line) - 1) : 0;
        const end = end_line ? parseInt(end_line) : lines.length;
        content =
          `[Lines ${start + 1}–${end} of ${filepath}]\n\n` +
          lines.slice(start, end).join("\n");
      }
      return content;
    },
    args: ["filepath", "start_line", "end_line"],
    desc: "Reads a specific file with line numbers. Optionally provide start_line and end_line to read a section. Use when you need to understand what specific code does.",
  },
  read_readme: {
    fn: (r, args) => readReadme(r, args.filepath),
    args: ["filepath"],
    desc: "Reads the README (or another doc file). Use to get a high-level project overview, purpose, and usage.",
  },
  search_code: {
    fn: (r, args) => {
      if (!args.pattern)
        return "Error: search_code requires a 'pattern' argument.";
      return searchCode(r, args.pattern, args.file_glob);
    },
    args: ["pattern", "file_glob"],
    desc: "Searches for a text pattern across all tracked files using git grep. Provide 'pattern' and optionally 'file_glob' (e.g. '*.ts'). Use to find function definitions, class names, or specific strings.",
  },
  contributors: {
    fn: (r) => getContributors(r),
    args: [],
    desc: "Returns a ranked list of all contributors with commit counts. Use when asked about team members, authors, or contribution history.",
  },
};

export function runTool(
  name: string,
  repoPath: string,
  args: Record<string, string> = {},
): string {
  const tool = TOOLS[name as keyof typeof TOOLS];
  if (!tool)
    return `Error: Unknown tool '${name}'. Available: ${Object.keys(TOOLS).join(", ")}`;
  try {
    return tool.fn(repoPath, args);
  } catch (e) {
    return `Error running tool '${name}': ${e}`;
  }
}

export function buildToolDescriptions(): string {
  return Object.entries(TOOLS)
    .map(([name, t]) => {
      const argsStr = t.args.length ? ` Arguments: ${t.args.join(", ")}` : "";
      return `- ${name}:${argsStr}\n  ${t.desc}`;
    })
    .join("\n");
}
