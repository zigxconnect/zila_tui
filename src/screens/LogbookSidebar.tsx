import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { readContributorLogbook } from "../utils/logbookEnricher.js";
import { loadGitHubAuth } from "../utils/githubAuth.js";
import { loadAuth } from "../utils/auth.js";

interface LogbookSidebarProps {
  width?: number;
  height?: number;
  scrollOffset?: number;
}

export const LogbookSidebar: React.FC<LogbookSidebarProps> = ({
  width = 44,
  height = 28,
  scrollOffset = 0,
}) => {
  const [logbookData, setLogbookData] = useState<{
    path: string;
    content: string;
    exists: boolean;
  }>({ path: "", content: "", exists: false });

  useEffect(() => {
    const gh = loadGitHubAuth();
    const zigAuth = loadAuth();
    const candidateUser = gh?.username || (zigAuth?.email ? zigAuth.email.split("@")[0] : undefined);
    const data = readContributorLogbook(candidateUser);
    setLogbookData(data);
  }, []);

  const lines = logbookData.exists
    ? logbookData.content.split("\n")
    : [
        "No verified logbook entries yet.",
        "",
        "Entries are automatically enriched",
        "upon completing daily task evaluations:",
        "  zila submit-task",
        "",
        `Expected location:`,
        `  ${logbookData.path.slice(-38)}`,
      ];

  const visibleLines = lines.slice(scrollOffset, scrollOffset + Math.max(1, height - 6));

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={theme.colors.retroBlueBright}
      paddingX={1}
      paddingY={0}
    >
      {/* Sidebar Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroCyanBright} bold>
            📖 LOGBOOK
          </Text>
        </Box>
        <Text color={theme.colors.retroGreenBright} bold>
          Audit Ledger
        </Text>
      </Box>

      {/* Subheader / location */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text color={theme.colors.retroSlateDark} wrap="truncate">
          contributors/.../logbook.md
        </Text>
        <Text color={theme.colors.retroSlateDark}>
          {lines.length} lines
        </Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>
        {"─".repeat(Math.max(10, width - 4))}
      </Text>

      {/* Logbook Content Stream */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleLines.map((line, idx) => {
          let color: string = theme.colors.retroSlate;
          let bold = false;

          if (line.startsWith("#")) {
            color = theme.colors.retroWhite;
            bold = true;
          } else if (line.includes("PASS") || line.includes("[x]")) {
            color = theme.colors.retroGreenBright;
          } else if (line.includes("FAIL") || line.includes("[ ]")) {
            color = theme.colors.error;
          } else if (line.startsWith("- **")) {
            color = theme.colors.retroCyanBright;
          } else if (line.startsWith("---")) {
            color = theme.colors.retroBlue;
          }

          return (
            <Text key={idx} color={color} bold={bold} wrap="truncate">
              {line || " "}
            </Text>
          );
        })}
      </Box>

      {/* Footer Instructions */}
      <Box marginTop={0} borderStyle="single" borderColor={theme.colors.retroSlateDark} paddingX={0}>
        <Text color={theme.colors.retroSlateDark} dimColor wrap="truncate">
          'close logbook' to toggle
        </Text>
      </Box>
    </Box>
  );
};
