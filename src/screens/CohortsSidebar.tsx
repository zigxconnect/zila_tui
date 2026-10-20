import React, { useState, useEffect } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { ZigexLoader } from "../ui/Spinner.js";
import { zilaApi } from "../utils/auth.js";
import { getActiveCohort } from "../utils/activeCohort.js";
import {
  SidebarContainer,
  SidebarTwoColumnRow,
  SidebarDivider,
  SidebarLine,
  SidebarEmptyRows,
} from "../ui/sidebarLayout.js";

interface CohortsSidebarProps {
  width?: number;
  height?: number;
  scrollOffset?: number;
  isFocused?: boolean;
}

interface CohortItem {
  id: string;
  name: string;
  department?: string;
  level?: string;
  isPaid?: boolean;
  tasksSubmittedCount?: number;
  freeTasksMax?: number;
  supervisorName?: string;
  role?: string;
  status?: string;
}

export const CohortsSidebar: React.FC<CohortsSidebarProps> = ({
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
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<CohortItem[]>([]);
  const activeCohort = getActiveCohort();

  useEffect(() => {
    let active = true;
    zilaApi<any>("/cohorts")
      .then((data) => {
        if (!active) return;
        const list: CohortItem[] = (Array.isArray(data) ? data : data?.cohorts || []).map((c: any) => ({
          id: c.id || c._id,
          name: c.name || "Cohort",
          department: c.department || c.track,
          level: c.level,
          isPaid: Boolean(c.isPaid || c.hasPaid),
          tasksSubmittedCount: c.tasksSubmittedCount || c.evaluationsCount || 0,
          freeTasksMax: c.freeTasksMax ?? 5,
          supervisorName: c.supervisorName || c.supervisor?.name,
          role: c.role,
          status: c.status,
        }));
        setCohorts(list);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const innerWidth = Math.max(20, effectiveWidth - 2);
  const innerHeight = Math.max(8, effectiveHeight - 2);
  const fixedChrome = 4;
  const availableContentRows = Math.max(3, innerHeight - fixedChrome);
  const maxVisibleCohorts = Math.max(1, Math.floor(availableContentRows / 3));

  useInput((_input, key) => {
    if (!isFocused) return;
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - 2));
    } else if (key.pageDown) {
      const maxScroll = Math.max(0, cohorts.length - maxVisibleCohorts);
      setScrollOffset((prev) => Math.min(maxScroll, prev + 2));
    }
  });

  const visibleCohorts = cohorts.slice(scrollOffset, scrollOffset + maxVisibleCohorts);
  let contentRowsCount = 0;

  return (
    <SidebarContainer width={effectiveWidth} height={effectiveHeight} isFocused={isFocused}>
      {/* 1. Top Header */}
      <SidebarTwoColumnRow
        left={{ text: "🎓 ENROLLED PROGRAMS", color: theme.colors.retroCyanBright, bold: true }}
        right={{ text: "● SESSIONS", color: theme.colors.retroGreenBright, bold: true }}
        width={innerWidth}
      />

      {/* 2. Subheader */}
      <SidebarTwoColumnRow
        left={{ text: "Zigex Placements & Cohorts", color: theme.colors.retroSlateDark }}
        right={{ text: `${cohorts.length} enrolled`, color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />

      {/* 3. Subtle Divider */}
      <SidebarDivider width={innerWidth} />

      {/* 4. Stream Content */}
      {loading && (
        <>
          {(() => { contentRowsCount += 1; return null; })()}
          <Box flexDirection="row" width={innerWidth}>
            <Text backgroundColor={theme.colors.sidebarBg}> </Text>
            <ZigexLoader suffix="enrolled programs ..." />
            <Text backgroundColor={theme.colors.sidebarBg}>
              {" ".repeat(Math.max(0, innerWidth - 30))}
            </Text>
          </Box>
        </>
      )}

      {!loading && cohorts.length === 0 && (
        <>
          {(() => { contentRowsCount += 2; return null; })()}
          <SidebarLine
            text="No enrolled programs found."
            width={innerWidth}
            color={theme.colors.retroSlateDark}
          />
          <SidebarLine
            text="Apply in Zigex App student dashboard to enroll."
            width={innerWidth}
            color={theme.colors.retroSlateDark}
          />
        </>
      )}

      {!loading &&
        visibleCohorts.map((c) => {
          contentRowsCount += 3;
          const isActive = activeCohort && activeCohort.id === c.id;
          const isPaid = Boolean(c.isPaid);
          const used = c.tasksSubmittedCount || 0;
          const maxFree = c.freeTasksMax ?? 5;
          const prefix = isActive ? "[ACTIVE] " : "• ";
          const title = `${prefix}${c.name}`;
          const trackInfo = `${(c.department || "General").toUpperCase()} · ${(c.level || "intermediate").toUpperCase()}`;
          const tuitionInfo = isPaid ? "Tuition: Paid" : `Trial: ${used}/${maxFree} used`;

          return (
            <React.Fragment key={c.id}>
              {/* Row A: Title */}
              <SidebarLine
                text={title}
                width={innerWidth}
                color={isActive ? theme.colors.retroCyanBright : theme.colors.white}
                bold
              />
              {/* Row B: Track & Tuition Status */}
              <SidebarTwoColumnRow
                left={{ text: `  Track: ${trackInfo}`, color: theme.colors.retroSlate }}
                right={{
                  text: tuitionInfo,
                  color: isPaid ? theme.colors.retroGreenBright : theme.colors.retroAmberBright,
                  bold: true,
                }}
                width={innerWidth}
              />
              {/* Row C: Supervisor */}
              <SidebarLine
                text={`  Supervisor: ${c.supervisorName || "Assigned Supervisor"}`}
                width={innerWidth}
                color={theme.colors.retroSlateDark}
              />
            </React.Fragment>
          );
        })}

      {/* Fill empty rows to guarantee 100% solid VS Code background coverage */}
      <SidebarEmptyRows count={Math.max(0, innerHeight - fixedChrome - contentRowsCount)} width={innerWidth} />

      {/* 5. Clean Status Footer */}
      <SidebarTwoColumnRow
        left={{
          text: `Programs ${cohorts.length ? scrollOffset + 1 : 0}-${Math.min(
            cohorts.length,
            scrollOffset + maxVisibleCohorts
          )} of ${cohorts.length}`,
          color: theme.colors.retroSlateDark,
        }}
        right={{ text: "'close' hide · PgUp/PgDn", color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />
    </SidebarContainer>
  );
};
