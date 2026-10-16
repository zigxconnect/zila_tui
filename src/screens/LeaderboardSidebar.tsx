import React, { useState, useEffect } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { ZigexLoader } from "../ui/Spinner.js";
import { fetchLeaderboardData, LeaderboardEntry, LeaderboardData } from "./LeaderboardScreen.js";
import { getActiveCohort } from "../utils/activeCohort.js";

interface LeaderboardSidebarProps {
  width?: number;
  height?: number;
  scrollOffset?: number;
}

export const LeaderboardSidebar: React.FC<LeaderboardSidebarProps> = ({
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
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchLeaderboardData()
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const activeCohort = getActiveCohort();
  const cohortTitle = data?.cohortName || activeCohort?.name || "Active Cohort";
  const entries: LeaderboardEntry[] = data?.entries ?? [];

  const maxVisibleEntries = Math.max(4, effectiveHeight - 6);

  useInput((_input, key) => {
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - 5));
    } else if (key.pageDown) {
      const maxScroll = Math.max(0, entries.length - maxVisibleEntries);
      setScrollOffset((prev) => Math.min(maxScroll, prev + 5));
    }
  });

  const visibleEntries = entries.slice(scrollOffset, scrollOffset + maxVisibleEntries);
  const innerWidth = Math.max(20, effectiveWidth - 2);

  // Column width calculations
  const rankWidth = 5;
  const ptsWidth = 9;
  const statusWidth = 11;
  const nameWidth = Math.max(12, innerWidth - rankWidth - ptsWidth - statusWidth - 4);

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
      {/* Claude Code Style Top Header Bar */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroCyanBright} bold wrap="truncate">
            🏆 LEADERBOARD
          </Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroGreenBright} bold>
            ● LIVE RANKINGS
          </Text>
        </Box>
      </Box>

      {/* Editor Subheader: cohort info and count */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text color={theme.colors.retroSlateDark} wrap="truncate">
          {cohortTitle.slice(0, effectiveWidth - 18)}
        </Text>
        <Text color={theme.colors.retroSlateDark}>
          {entries.length} interns
        </Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>
        {"─".repeat(innerWidth)}
      </Text>

      {/* Table Column Headers */}
      <Box flexDirection="row" gap={1}>
        <Box width={rankWidth}>
          <Text color={theme.colors.retroBlueBright} bold>
            RANK
          </Text>
        </Box>
        <Box width={nameWidth}>
          <Text color={theme.colors.retroSlateDark}>
            INTERN
          </Text>
        </Box>
        <Box width={ptsWidth}>
          <Text color={theme.colors.retroSlateDark}>
            POINTS
          </Text>
        </Box>
        <Box width={statusWidth}>
          <Text color={theme.colors.retroSlateDark}>
            STATUS
          </Text>
        </Box>
      </Box>

      {/* Stream Content */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {loading && (
          <Box paddingY={1}>
            <ZigexLoader suffix="cohort leaderboard" />
          </Box>
        )}

        {!loading && entries.length === 0 && (
          <Box flexDirection="column" paddingY={1}>
            <Text color={theme.colors.retroSlateDark}>
              No submissions recorded yet for this cohort.
            </Text>
            <Text color={theme.colors.retroSlateDark}>
              Run 'submit-task' or 'submit-report' to log your work.
            </Text>
          </Box>
        )}

        {!loading &&
          visibleEntries.map((entry) => {
            const isMe =
              (data?.currentStudentEmail &&
                entry.studentEmail.toLowerCase() === data.currentStudentEmail.toLowerCase()) ||
              (data?.currentStudentId && entry.studentId === data.currentStudentId);

            let rankColor: string = theme.colors.retroSlate;
            if (entry.rank === 1) rankColor = theme.colors.retroAmberBright;
            else if (entry.rank === 2) rankColor = theme.colors.retroWhite;
            else if (entry.rank === 3) rankColor = theme.colors.retroCyan;

            let badge = "—";
            let badgeColor: string = theme.colors.retroSlateDark;
            if (entry.status === "accepted") {
              badge = "✔ Accepted";
              badgeColor = theme.colors.retroGreenBright;
            } else if (entry.status === "rejected") {
              badge = "✖ Rejected";
              badgeColor = theme.colors.error;
            } else if (entry.status === "pending") {
              badge = "⏳ Pending";
              badgeColor = theme.colors.retroAmber;
            }

            const displayName = (isMe ? `› ${entry.name}` : entry.name).slice(0, nameWidth);

            return (
              <Box key={entry.studentId || `${entry.rank}-${entry.name}`} flexDirection="row" gap={1}>
                <Box width={rankWidth}>
                  <Text color={rankColor} bold={entry.rank <= 3}>
                    #{entry.rank}
                  </Text>
                </Box>
                <Box width={nameWidth}>
                  <Text
                    color={isMe ? theme.colors.retroCyanBright : theme.colors.white}
                    bold={Boolean(isMe)}
                    wrap="truncate"
                  >
                    {displayName}
                  </Text>
                </Box>
                <Box width={ptsWidth}>
                  <Text color={isMe ? theme.colors.retroGreenBright : theme.colors.retroSlate}>
                    {entry.points} pts
                  </Text>
                </Box>
                <Box width={statusWidth}>
                  <Text color={badgeColor} wrap="truncate">
                    {badge}
                  </Text>
                </Box>
              </Box>
            );
          })}
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>
        {"─".repeat(innerWidth)}
      </Text>

      {/* Claude Code Style Status Footer */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text color={theme.colors.retroSlateDark}>
          Rankings {entries.length ? scrollOffset + 1 : 0}-{Math.min(entries.length, scrollOffset + maxVisibleEntries)} of {entries.length}
        </Text>
        <Text color={theme.colors.retroCyanBright} dimColor>
          'close' to hide · PgUp/PgDn
        </Text>
      </Box>
    </Box>
  );
};
