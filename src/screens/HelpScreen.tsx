import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";

interface HelpScreenProps {
  onClose: () => void;
  onSelect: (command: string) => void;
  clearHistory: () => void;
}

interface CommandItem {
  cmd: string;
  desc: string;
}

const COMMAND_GROUPS: { group: string; items: CommandItem[] }[] = [
  {
    group: "AUTHENTICATION & SETUP",
    items: [
      { cmd: "auth", desc: "Log in with your Zigex student account" },
      { cmd: "gh-auth <token>", desc: "Connect GitHub account using Personal Access Token" },
      { cmd: "gh-status", desc: "Check GitHub connection status" },
      { cmd: "gh-logout", desc: "Disconnect GitHub credentials" },
    ],
  },
  {
    group: "COHORT & TEAM COLLABORATION",
    items: [
      { cmd: "group", desc: "View fellow interns and supervisor (admin) in your cohort" },
      { cmd: "cohorts", desc: "List all your active placements and cohorts" },
      { cmd: "downloads", desc: "Clone/sync course repository and materials for git collaboration" },
      { cmd: "leaderboard", desc: "View rankings and standings in your cohort" },
    ],
  },
  {
    group: "ASSIGNMENTS & TASKS",
    items: [
      { cmd: "tasks", desc: "View all tasks assigned by your supervisor" },
      { cmd: "task-details <id>", desc: "Inspect requirements, deadlines, and points for a task" },
      { cmd: "submit-task <id>", desc: "Submit assignment with GitHub repository & PR link" },
      { cmd: "docs", desc: "Search and read learning documents and guides" },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { cmd: "clear", desc: "Clear terminal history" },
      { cmd: "info", desc: "Display system version and configuration" },
      { cmd: "exit", desc: "Quit ZILA agent" },
    ],
  },
];

export const HelpScreen: React.FC<HelpScreenProps> = ({ onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === "q" || key.return) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.primaryBright}>
          ================================================================================
        </Text>
        <Text bold color={theme.colors.primaryBright}>
          ZILA AGENT - COMMAND REFERENCE
        </Text>
        <Text color={theme.colors.muted}>
          Terminal-first workflow for Zigex interns and developers
        </Text>
        <Text bold color={theme.colors.primaryBright}>
          ================================================================================
        </Text>
      </Box>

      {COMMAND_GROUPS.map((sec) => (
        <Box key={sec.group} flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.accentBright}>
            {sec.group}:
          </Text>
          {sec.items.map((it) => (
            <Box key={it.cmd} paddingLeft={2}>
              <Text bold color={theme.colors.textBright}>
                {it.cmd.padEnd(24)}
              </Text>
              <Text color={theme.colors.muted}>- {it.desc}</Text>
            </Box>
          ))}
        </Box>
      ))}

      <Box marginTop={1} flexDirection="column">
        <Text color={theme.colors.dim}>
          --------------------------------------------------------------------------------
        </Text>
        <Text color={theme.colors.dim}>
          Press [ESC], [ENTER], or [q] to return to the interactive prompt.
        </Text>
      </Box>
    </Box>
  );
};
