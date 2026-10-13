import React, { useState, useEffect } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { readContributorLogbook, syncContributorLogbookFromGitHub } from "../utils/logbookEnricher.js";
import { loadGitHubAuth } from "../utils/githubAuth.js";
import { loadAuth } from "../utils/auth.js";

interface LogbookSidebarProps {
  width?: number;
  height?: number;
  scrollOffset?: number;
}

export const LogbookSidebar: React.FC<LogbookSidebarProps> = ({
  width,
  height,
  scrollOffset: initialScrollOffset = 0,
}) => {
  const { stdout } = useStdout();
  const termCols = stdout?.columns || process.stdout.columns || 120;
  const termRows = stdout?.rows || process.stdout.rows || 36;

  const effectiveWidth = width ?? Math.max(40, Math.floor(termCols * 0.48));
  const effectiveHeight = height ?? Math.max(18, termRows - 3);

  const [scrollOffset, setScrollOffset] = useState<number>(initialScrollOffset);
  const [logbookData, setLogbookData] = useState<{
    path: string;
    content: string;
    exists: boolean;
  }>({ path: "", content: "", exists: false });

  useEffect(() => {
    const gh = loadGitHubAuth();
    const zigAuth = loadAuth();
    const candidateUser =
      gh?.username || (zigAuth?.email ? zigAuth.email.split("@")[0] : undefined);
    const data = readContributorLogbook(candidateUser);
    setLogbookData(data);

    if (!data.exists || !data.content || !data.content.includes("### 📝 Submission:")) {
      syncContributorLogbookFromGitHub(candidateUser)
        .then((res) => {
          if (res.synced > 0) {
            const refreshed = readContributorLogbook(candidateUser);
            setLogbookData(refreshed);
          }
        })
        .catch(() => {});
    }
  }, []);

  const rawLines = logbookData.exists
    ? logbookData.content.split("\n")
    : [
        "# Engineering Internship Contributor Logbook",
        "",
        `**Status:** Awaiting first evaluated submission`,
        "",
        "No verified logbook entries yet in audit ledger.",
        "",
        "Entries are automatically enriched upon completing daily tasks:",
        "  zila submit-task",
        "",
        `Expected File Path:`,
        `  ${logbookData.path.slice(-44)}`,
        "",
        "---",
        "Run task evaluations to record your score & supervisor rubrics here.",
      ];

  // Number of lines that fit inside content viewport
  const maxVisibleLines = Math.max(4, effectiveHeight - 5);

  useInput((_input, key) => {
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - 8));
    } else if (key.pageDown) {
      const maxScroll = Math.max(0, rawLines.length - maxVisibleLines);
      setScrollOffset((prev) => Math.min(maxScroll, prev + 8));
    }
  });

  const visibleLines = rawLines.slice(scrollOffset, scrollOffset + maxVisibleLines);
  const lineNumGutterWidth = Math.max(3, String(rawLines.length).length + 1);
  const innerWidth = Math.max(20, effectiveWidth - 2);

  // Shorten file path for title bar
  const displayFileName = logbookData.path
    ? logbookData.path.split("/").slice(-2).join("/")
    : "contributors/.../logbook.md";

  return (
    <Box
      flexDirection="column"
      width={effectiveWidth}
      height={effectiveHeight}
      borderStyle="round"
      borderColor={theme.colors.retroBlueBright}
      paddingX={1}
      paddingY={0}
    >
      {/* Claude Code Style Top Editor Bar */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroCyanBright} bold>
            📄 {displayFileName}
          </Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroGreenBright} bold>
            ● AUDIT LEDGER
          </Text>
        </Box>
      </Box>

      {/* Editor Subheader: format and lines count */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text color={theme.colors.retroSlateDark} wrap="truncate">
          Markdown · UTF-8
        </Text>
        <Text color={theme.colors.retroSlateDark}>
          {rawLines.length} lines
        </Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>
        {"─".repeat(innerWidth)}
      </Text>

      {/* File Stream Content with Line Numbers Gutter */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleLines.map((line, idx) => {
          const actualLineNum = scrollOffset + idx + 1;
          let color: string = theme.colors.retroSlate;
          let bold = false;

          if (line.startsWith("#")) {
            color = theme.colors.retroWhite;
            bold = true;
          } else if (line.includes("PASS") || line.includes("[x]")) {
            color = theme.colors.retroGreenBright;
          } else if (line.includes("FAIL") || line.includes("[ ]")) {
            color = theme.colors.error;
          } else if (line.startsWith("- **") || line.startsWith("###")) {
            color = theme.colors.retroCyanBright;
          } else if (line.startsWith("---")) {
            color = theme.colors.retroBlue;
          }

          return (
            <Box key={actualLineNum} flexDirection="row" gap={1}>
              <Text color={theme.colors.retroSlateDark} dimColor>
                {String(actualLineNum).padStart(lineNumGutterWidth, " ")}│
              </Text>
              <Text color={color} bold={bold} wrap="truncate">
                {line || " "}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>
        {"─".repeat(innerWidth)}
      </Text>

      {/* Claude Code Style Editor Status Footer */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text color={theme.colors.retroSlateDark}>
          Ln {scrollOffset + 1}-{Math.min(rawLines.length, scrollOffset + maxVisibleLines)} of {rawLines.length}
        </Text>
        <Text color={theme.colors.retroCyanBright} dimColor>
          'close logbook' to hide · PgUp/PgDn
        </Text>
      </Box>
    </Box>
  );
};
