import React, { useState, useEffect } from "react";
import { useStdout, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { fetchLeaderboardData, LeaderboardEntry, LeaderboardData } from "./LeaderboardScreen.js";
import { getActiveCohort } from "../utils/activeCohort.js";
import {
  SidebarContainer,
  SidebarTwoColumnRow,
  SidebarDivider,
  SidebarTableRow,
  SidebarLine,
  SidebarLoadingRow,
  SidebarEmptyRows,
} from "../ui/sidebarLayout.js";

interface LeaderboardSidebarProps {
  width?: number;
  height?: number;
  scrollOffset?: number;
  isFocused?: boolean;
}

export const LeaderboardSidebar: React.FC<LeaderboardSidebarProps> = ({
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

  const innerWidth = Math.max(20, effectiveWidth - 2);
  const innerHeight = Math.max(8, effectiveHeight - 2);
  const fixedChrome = 5;
  const maxVisibleEntries = Math.max(3, innerHeight - fixedChrome);

  useInput((_input, key) => {
    if (!isFocused) return;
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - 5));
    } else if (key.pageDown) {
      const maxScroll = Math.max(0, entries.length - maxVisibleEntries);
      setScrollOffset((prev) => Math.min(maxScroll, prev + 5));
    }
  });

  const visibleEntries = entries.slice(scrollOffset, scrollOffset + maxVisibleEntries);

  // Column width calculations (exact fit for innerWidth - 2)
  const rankWidth = 5;
  const ptsWidth = 8;
  const statusWidth = 12;
  const nameWidth = Math.max(10, innerWidth - 2 - rankWidth - ptsWidth - statusWidth);

  const contentRowsCount = loading
    ? 1
    : entries.length === 0
    ? 2
    : visibleEntries.length;

  return (
    <SidebarContainer width={effectiveWidth} height={effectiveHeight} isFocused={isFocused}>
      {/* 1. Header Bar */}
      <SidebarTwoColumnRow
        left={{ text: "🏆 LEADERBOARD", color: theme.colors.retroCyanBright, bold: true }}
        right={{ text: "● LIVE RANKINGS", color: theme.colors.retroGreenBright, bold: true }}
        width={innerWidth}
      />

      {/* 2. Subheader Bar */}
      <SidebarTwoColumnRow
        left={{ text: cohortTitle, color: theme.colors.retroSlateDark }}
        right={{ text: `${entries.length} interns`, color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />

      {/* 3. Subtle Divider */}
      <SidebarDivider width={innerWidth} />

      {/* 4. Column Headers */}
      <SidebarTableRow
        columns={[
          { text: "RANK", width: rankWidth, color: theme.colors.retroCyanBright, bold: true },
          { text: "INTERN", width: nameWidth, color: theme.colors.retroSlateDark },
          { text: "POINTS", width: ptsWidth, color: theme.colors.retroSlateDark },
          { text: "STATUS", width: statusWidth, color: theme.colors.retroSlateDark },
        ]}
        width={innerWidth}
      />

      {/* 5. Stream Content */}
      {loading && (
        <SidebarLoadingRow suffix="cohort leaderboard" width={innerWidth} />
      )}

      {!loading && entries.length === 0 && (
        <>
          <SidebarLine
            text="No submissions recorded yet for this cohort."
            width={innerWidth}
            color={theme.colors.retroSlateDark}
          />
          <SidebarLine
            text="Run 'submit-task' or 'submit-report' to log work."
            width={innerWidth}
            color={theme.colors.retroSlateDark}
          />
        </>
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

          const displayName = isMe ? `› ${entry.name}` : entry.name;

          return (
            <SidebarTableRow
              key={entry.studentId || `${entry.rank}-${entry.name}`}
              columns={[
                { text: `#${entry.rank}`, width: rankWidth, color: rankColor, bold: entry.rank <= 3 },
                {
                  text: displayName,
                  width: nameWidth,
                  color: isMe ? theme.colors.retroCyanBright : theme.colors.white,
                  bold: Boolean(isMe),
                },
                {
                  text: `${entry.points} pts`,
                  width: ptsWidth,
                  color: isMe ? theme.colors.retroGreenBright : theme.colors.retroSlate,
                },
                { text: badge, width: statusWidth, color: badgeColor },
              ]}
              width={innerWidth}
            />
          );
        })}

      {/* Fill remaining empty rows to maintain solid VS Code background across the full viewport */}
      <SidebarEmptyRows count={Math.max(0, innerHeight - fixedChrome - contentRowsCount)} width={innerWidth} />

      {/* 6. Footer Status */}
      <SidebarTwoColumnRow
        left={{
          text: `Rankings ${entries.length ? scrollOffset + 1 : 0}-${Math.min(
            entries.length,
            scrollOffset + maxVisibleEntries
          )} of ${entries.length}`,
          color: theme.colors.retroSlateDark,
        }}
        right={{ text: "'close' hide · PgUp/PgDn", color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />
    </SidebarContainer>
  );
};
