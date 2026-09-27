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
  category: string;
  desc: string;
}

const COMMAND_CATALOG: CommandItem[] = [
  { cmd: "group", category: "COHORT", desc: "View fellow interns & supervisor admin" },
  { cmd: "cohorts", category: "COHORT", desc: "List all active cohorts & tracks" },
  { cmd: "downloads", category: "COHORT", desc: "Clone course materials & repo" },
  { cmd: "leaderboard", category: "COHORT", desc: "Cohort ranking & intern points" },
  { cmd: "tasks", category: "WORK", desc: "List assigned tasks & deadlines" },
  { cmd: "submit-task", category: "WORK", desc: "Interactive task PR submission" },
  { cmd: "submit-report", category: "WORK", desc: "Draft & submit daily progress report" },
  { cmd: "docs [query]", category: "LIBRARY", desc: "Search Zigex engineering documentation" },
  { cmd: "auth", category: "SECURITY", desc: "Authenticate with Zigex credentials" },
  { cmd: "gh-auth <tok>", category: "GITHUB", desc: "Connect GitHub Personal Access Token" },
  { cmd: "gh-status", category: "GITHUB", desc: "Check GitHub connection & identity" },
  { cmd: "stats", category: "DIAG", desc: "Workstation activity telemetry" },
  { cmd: "info", category: "SYSTEM", desc: "System runtime & cache diagnosis" },
  { cmd: "about", category: "SYSTEM", desc: "Workstation credits & architecture" },
  { cmd: "clear", category: "SYSTEM", desc: "Clear terminal scrollback buffer" },
  { cmd: "exit", category: "SYSTEM", desc: "Terminate terminal session" },
];

export const HelpScreen: React.FC<HelpScreenProps> = ({ onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === "q" || key.return) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* 90s Turbo Vision Style Help Window */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.accent}
        paddingX={1}
      >
        {/* Window Header */}
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Box flexDirection="row">
            <Text color={theme.colors.retroCyanBright} bold>
              [ ZILA WORKSTATION COMMAND REFERENCE MANUAL ]
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen} bold>[16 COMMANDS]</Text>
          </Box>
        </Box>

        {/* Table Column Titles */}
        <Box flexDirection="row" borderStyle="single" borderColor={theme.colors.border} paddingX={1}>
          <Box width={18}>
            <Text color={theme.colors.muted} bold>COMMAND</Text>
          </Box>
          <Box width={12}>
            <Text color={theme.colors.muted} bold>SUBSYSTEM</Text>
          </Box>
          <Box>
            <Text color={theme.colors.muted} bold>DESCRIPTION</Text>
          </Box>
        </Box>

        {/* Commands List */}
        {COMMAND_CATALOG.map((item, idx) => (
          <Box
            key={item.cmd}
            flexDirection="row"
            paddingX={1}
            paddingY={0}
          >
            <Box width={18}>
              <Text color={theme.colors.textBright} bold>
                {item.cmd}
              </Text>
            </Box>
            <Box width={12}>
              <Text color={theme.colors.retroCyan}>
                {item.category}
              </Text>
            </Box>
            <Box>
              <Text color={theme.colors.text}>
                {item.desc}
              </Text>
            </Box>
          </Box>
        ))}

        {/* Footer Hotkey Legend */}
        <Box marginTop={1} flexDirection="row" justifyContent="space-between">
          <Box flexDirection="row">
            <Text color={theme.colors.dim}>[ESC / ENTER / q: CLOSE HELP]  [^C: QUIT]</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.accent}>Type any command at the prompt</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
