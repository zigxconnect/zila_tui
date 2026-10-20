import React, { useState, useEffect } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { readContributorLogbook, syncContributorLogbookFromGitHub } from "../utils/logbookEnricher.js";
import { loadGitHubAuth } from "../utils/githubAuth.js";
import { loadAuth } from "../utils/auth.js";
import {
  SidebarContainer,
  SidebarTwoColumnRow,
  SidebarDivider,
  SidebarEmptyRows,
  padVisual,
} from "../ui/sidebarLayout.js";

interface LogbookSidebarProps {
  width?: number;
  height?: number;
  scrollOffset?: number;
  isFocused?: boolean;
}

export const LogbookSidebar: React.FC<LogbookSidebarProps> = ({
  width,
  height,
  scrollOffset: initialScrollOffset = 0,
  isFocused = true,
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
    try {
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
    } catch {
      // Silently handle auth/file errors
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
        `  ${(logbookData.path || "contributors/default/logbook.md").slice(-40)}`,
        "",
        "---",
        "Run task evaluations to record score & rubrics here.",
      ];

  const innerWidth = Math.max(20, effectiveWidth - 2);
  const innerHeight = Math.max(8, effectiveHeight - 2);
  const fixedChrome = 4;
  const maxVisibleLines = Math.max(3, innerHeight - fixedChrome);

  useInput((_input, key) => {
    if (!isFocused) return;
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - 8));
    } else if (key.pageDown) {
      const maxScroll = Math.max(0, rawLines.length - maxVisibleLines);
      setScrollOffset((prev) => Math.min(maxScroll, prev + 8));
    }
  });

  const visibleLines = rawLines.slice(scrollOffset, scrollOffset + maxVisibleLines);
  const lineNumGutterWidth = Math.max(3, String(rawLines.length).length + 1);

  // Shorten file path for title bar
  const displayFileName = logbookData.path
    ? logbookData.path.split("/").slice(-1)[0] || "logbook.md"
    : "logbook.md";

  const panelBg = theme.colors.sidebarBg;
  const textColWidth = Math.max(10, innerWidth - 2 - lineNumGutterWidth - 1);

  return (
    <SidebarContainer width={effectiveWidth} height={effectiveHeight} isFocused={isFocused}>
      {/* 1. Header Bar */}
      <SidebarTwoColumnRow
        left={{ text: `📄 ${displayFileName}`, color: theme.colors.retroCyanBright, bold: true }}
        right={{ text: "● AUDIT LEDGER", color: theme.colors.retroGreenBright, bold: true }}
        width={innerWidth}
      />

      {/* 2. Subheader Bar */}
      <SidebarTwoColumnRow
        left={{ text: "Markdown · UTF-8", color: theme.colors.retroSlateDark }}
        right={{ text: `${rawLines.length} lines`, color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />

      {/* 3. Subtle Divider */}
      <SidebarDivider width={innerWidth} />

      {/* 4. File Stream Lines */}
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
          color = theme.colors.sidebarDivider;
        }

        const gutterStr = String(actualLineNum).padStart(lineNumGutterWidth - 1, " ") + "│";
        const contentStr = padVisual(line || " ", textColWidth);

        return (
          <Box key={actualLineNum} flexDirection="row" width={innerWidth}>
            <Text backgroundColor={panelBg}> </Text>
            <Text backgroundColor={panelBg} color={theme.colors.retroSlateDark} dimColor>
              {gutterStr}
            </Text>
            <Text backgroundColor={panelBg}> </Text>
            <Text backgroundColor={panelBg} color={color} bold={bold}>
              {contentStr}
            </Text>
            <Text backgroundColor={panelBg}> </Text>
          </Box>
        );
      })}

      {/* Fill empty lines to maintain 100% solid VS Code background across the full viewport */}
      <SidebarEmptyRows count={Math.max(0, maxVisibleLines - visibleLines.length)} width={innerWidth} />

      {/* 5. Clean Status Footer */}
      <SidebarTwoColumnRow
        left={{
          text: `Ln ${scrollOffset + 1}-${Math.min(
            rawLines.length,
            scrollOffset + maxVisibleLines
          )} of ${rawLines.length}`,
          color: theme.colors.retroSlateDark,
        }}
        right={{ text: "'close' hide · PgUp/PgDn", color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />
    </SidebarContainer>
  );
};
