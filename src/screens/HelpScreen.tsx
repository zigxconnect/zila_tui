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
  { cmd: "group --cohorts", category: "cohort", desc: "Pick a cohort and view its team" },
  { cmd: "cohorts", category: "cohort", desc: "List cohorts and IDs for team switching" },
  { cmd: "leaderboard", category: "cohort", desc: "Add --cohorts to pick a cohort ranking" },
  { cmd: "downloads", category: "cohort", desc: "Clone course materials & repo" },
  { cmd: "leaderboard", category: "cohort", desc: "Cohort ranking & intern points" },
  { cmd: "achievements", category: "cohort", desc: "Intern badges & milestone achievements" },
  { cmd: "tasks", category: "work", desc: "List assigned tasks & deadlines" },
  { cmd: "submit-task", category: "work", desc: "Interactive task PR submission" },
  { cmd: "submit-report", category: "work", desc: "Draft & submit daily progress report" },
  { cmd: "docs [query]", category: "library", desc: "Search Zigex engineering documentation" },
  { cmd: "auth", category: "auth", desc: "Authenticate with Zigex credentials" },
  { cmd: "github-auth", category: "auth", desc: "Connect GitHub in your browser" },
  { cmd: "gh-status", category: "auth", desc: "Check GitHub connection & identity" },
  { cmd: "stats", category: "telemetry", desc: "Workstation performance & credit stats" },
  { cmd: "cache", category: "system", desc: "In-memory CacheService telemetry & bench" },
  { cmd: "info", category: "system", desc: "System runtime & cache diagnosis" },
  { cmd: "about", category: "system", desc: "Workstation credits & architecture" },
  { cmd: "clear", category: "terminal", desc: "Clear terminal scrollback buffer" },
  { cmd: "exit", category: "terminal", desc: "Terminate terminal session" },
];

export const HelpScreen: React.FC<HelpScreenProps> = ({ onClose }) => {
  useInput((input, key) => {
    if (key.escape || input === "q" || key.return) {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"command reference"}</Text>
        </Box>
        <Text color={theme.colors.retroSlateDark}>{"18 commands"}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Column Headers */}
      <Box flexDirection="row" marginBottom={0}>
        <Box width={20}>
          <Text color={theme.colors.retroBlueBright} bold>{"COMMAND"}</Text>
        </Box>
        <Box width={14}>
          <Text color={theme.colors.retroSlateDark}>{"CATEGORY"}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.retroSlateDark}>{"DESCRIPTION"}</Text>
        </Box>
      </Box>

      {/* Command List */}
      {COMMAND_CATALOG.map((item) => (
        <Box key={item.cmd} flexDirection="row" paddingY={0}>
          <Box width={20}>
            <Text color={theme.colors.white} bold>{item.cmd}</Text>
          </Box>
          <Box width={14}>
            <Text color={theme.colors.retroSlateDark}>{item.category}</Text>
          </Box>
          <Box>
            <Text color={theme.colors.text}>{item.desc}</Text>
          </Box>
        </Box>
      ))}

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Footer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark}>{"esc / q / enter to close"}</Text>
        <Text color={theme.colors.retroSlateDark}>{"type any command at prompt"}</Text>
      </Box>
    </Box>
  );
};
