import React, { useState, useEffect } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { fetchCohortOptions, CohortOption } from "./CohortPickerScreen.js";
import { getActiveCohort } from "../utils/activeCohort.js";

interface CohortsSidebarProps {
  width?: number;
  height?: number;
  scrollOffset?: number;
}

export const CohortsSidebar: React.FC<CohortsSidebarProps> = ({
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
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);

  const activeCohort = getActiveCohort();

  useEffect(() => {
    let active = true;
    fetchCohortOptions()
      .then((items) => {
        if (!active) return;
        setCohorts(items);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        if (activeCohort) {
          setCohorts([activeCohort]);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const maxVisibleCohorts = Math.max(2, Math.floor((effectiveHeight - 6) / 3));

  useInput((_input, key) => {
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - 2));
    } else if (key.pageDown) {
      const maxScroll = Math.max(0, cohorts.length - maxVisibleCohorts);
      setScrollOffset((prev) => Math.min(maxScroll, prev + 2));
    }
  });

  const visibleCohorts = cohorts.slice(scrollOffset, scrollOffset + maxVisibleCohorts);
  const innerWidth = Math.max(20, effectiveWidth - 2);

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
      {/* Top Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroCyanBright} bold wrap="truncate">
            🎓 ENROLLED PROGRAMS
          </Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroGreenBright} bold>
            ● SESSIONS
          </Text>
        </Box>
      </Box>

      {/* Subheader */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text color={theme.colors.retroSlateDark} wrap="truncate">
          Zigex Placements & Cohorts
        </Text>
        <Text color={theme.colors.retroSlateDark}>
          {cohorts.length} enrolled
        </Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>
        {"─".repeat(innerWidth)}
      </Text>

      {/* Cohorts List */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {loading && (
          <Box paddingY={1}>
            <Text color={theme.colors.retroAmberBright}>
              Loading enrolled programs...
            </Text>
          </Box>
        )}

        {!loading && cohorts.length === 0 && (
          <Box flexDirection="column" paddingY={1}>
            <Text color={theme.colors.retroSlateDark}>
              No enrolled programs found.
            </Text>
            <Text color={theme.colors.retroSlateDark}>
              Apply in Zigex App student dashboard to enroll.
            </Text>
          </Box>
        )}

        {!loading &&
          visibleCohorts.map((c) => {
            const isActive = activeCohort && activeCohort.id === c.id;
            const isPaid = Boolean(c.isPaid);
            const used = c.tasksSubmittedCount || 0;
            const maxFree = c.freeTasksMax ?? 5;

            return (
              <Box key={c.id} flexDirection="column" marginY={0} paddingY={0}>
                <Box flexDirection="row" gap={1}>
                  {isActive && (
                    <Text color={theme.colors.retroGreenBright} bold>
                      [ACTIVE]
                    </Text>
                  )}
                  <Text color={isActive ? theme.colors.retroCyanBright : theme.colors.white} bold wrap="truncate">
                    {c.name}
                  </Text>
                </Box>
                <Box flexDirection="row" gap={1} paddingLeft={isActive ? 2 : 1}>
                  <Text color={theme.colors.retroSlateDark}>
                    Track:
                  </Text>
                  <Text color={theme.colors.retroSlate}>
                    {(c.department || "General").toUpperCase()} · {(c.level || "intermediate").toUpperCase()}
                  </Text>
                  <Text color={theme.colors.retroSlateDark}>·</Text>
                  <Text color={isPaid ? theme.colors.retroGreenBright : theme.colors.retroAmberBright} bold>
                    {isPaid ? "Tuition: Paid" : `Trial: ${used}/${maxFree} used`}
                  </Text>
                </Box>
                <Box flexDirection="row" gap={1} paddingLeft={isActive ? 2 : 1} marginBottom={1}>
                  <Text color={theme.colors.retroSlateDark}>
                    Supervisor:
                  </Text>
                  <Text color={theme.colors.retroSlate} wrap="truncate">
                    {c.supervisorName || "Assigned Supervisor"}
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

      {/* Status Footer */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text color={theme.colors.retroSlateDark}>
          Programs {cohorts.length ? scrollOffset + 1 : 0}-{Math.min(cohorts.length, scrollOffset + maxVisibleCohorts)} of {cohorts.length}
        </Text>
        <Text color={theme.colors.retroCyanBright} dimColor>
          'close' to hide · PgUp/PgDn
        </Text>
      </Box>
    </Box>
  );
};
