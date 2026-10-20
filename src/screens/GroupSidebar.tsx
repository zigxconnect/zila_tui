import React, { useState, useEffect } from "react";
import { useStdout, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { getActiveCohort } from "../utils/activeCohort.js";
import { loadAuth, zilaApi } from "../utils/auth.js";
import {
  SidebarContainer,
  SidebarTwoColumnRow,
  SidebarDivider,
  SidebarTableRow,
  SidebarLine,
  SidebarLoadingRow,
  SidebarEmptyRows,
} from "../ui/sidebarLayout.js";

interface GroupSidebarProps {
  width?: number;
  height?: number;
  scrollOffset?: number;
  isFocused?: boolean;
}

interface PeerItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  points: number;
}

export const GroupSidebar: React.FC<GroupSidebarProps> = ({
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
  const [cohortName, setCohortName] = useState<string>("Cohort Team");
  const [supervisor, setSupervisor] = useState<{ name: string; email?: string } | null>(null);
  const [peers, setPeers] = useState<PeerItem[]>([]);

  useEffect(() => {
    let active = true;
    const activeCohort = getActiveCohort();
    const auth = loadAuth();
    const myEmail = auth?.email?.toLowerCase();

    const targetUrl = activeCohort?.id
      ? `/cohorts/${encodeURIComponent(activeCohort.id)}/chat-group`
      : `/cohorts/group`;

    zilaApi<any>(targetUrl)
      .then((data) => {
        if (!active) return;
        if (data) {
          const cName = data.cohort?.name || data.chatContext?.cohortName || activeCohort?.name || "Cohort Team";
          setCohortName(cName);

          const sup = data.supervisor || data.chatContext?.supervisorAdmin;
          if (sup) {
            setSupervisor({ name: sup.name || sup.fullName || "Supervisor", email: sup.email });
          } else if (activeCohort?.supervisorName) {
            setSupervisor({ name: activeCohort.supervisorName, email: activeCohort.supervisorEmail });
          }

          const rawPeers = data.peers || data.chatContext?.members || [];
          const mapped: PeerItem[] = rawPeers
            .map((p: any) => ({
              id: p.id || p.studentId || p.userId,
              name: p.studentName || p.name || p.fullName || "Intern",
              email: p.studentEmail || p.email || "",
              role: p.role || "Intern",
              status: p.status || "Active",
              points: p.totalPoints || 0,
            }))
            .filter((p: PeerItem) => !myEmail || p.email.toLowerCase() !== myEmail);

          setPeers(mapped);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        if (activeCohort) {
          setCohortName(activeCohort.name);
          if (activeCohort.supervisorName) {
            setSupervisor({ name: activeCohort.supervisorName, email: activeCohort.supervisorEmail });
          }
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const innerWidth = Math.max(20, effectiveWidth - 2);
  const innerHeight = Math.max(8, effectiveHeight - 2);
  const fixedChrome = 5 + (supervisor ? 1 : 0);
  const maxVisiblePeers = Math.max(3, innerHeight - fixedChrome);

  useInput((_input, key) => {
    if (!isFocused) return;
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - 5));
    } else if (key.pageDown) {
      const maxScroll = Math.max(0, peers.length - maxVisiblePeers);
      setScrollOffset((prev) => Math.min(maxScroll, prev + 5));
    }
  });

  const visiblePeers = peers.slice(scrollOffset, scrollOffset + maxVisiblePeers);

  // Exact column sizing
  const availText = Math.max(12, innerWidth - 2);
  const idxWidth = 4;
  const statusWidth = 10;
  const remain = Math.max(10, availText - idxWidth - statusWidth);
  const emailWidth = Math.max(10, Math.floor(remain * 0.45));
  const nameWidth = Math.max(10, remain - emailWidth);

  const contentRowsCount = loading
    ? 1
    : peers.length === 0
    ? 2
    : visiblePeers.length;

  return (
    <SidebarContainer width={effectiveWidth} height={effectiveHeight} isFocused={isFocused}>
      {/* 1. Top Header */}
      <SidebarTwoColumnRow
        left={{ text: "👥 COHORT TEAM", color: theme.colors.retroCyanBright, bold: true }}
        right={{ text: "● PEER ROSTER", color: theme.colors.retroGreenBright, bold: true }}
        width={innerWidth}
      />

      {/* 2. Subheader */}
      <SidebarTwoColumnRow
        left={{ text: cohortName, color: theme.colors.retroSlateDark }}
        right={{ text: `${peers.length} active peers`, color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />

      {/* 3. Supervisor Banner (if present) */}
      {supervisor && (
        <SidebarLine
          text={`Supervisor: ${supervisor.name}${supervisor.email ? ` <${supervisor.email}>` : ""}`}
          width={innerWidth}
          color={theme.colors.retroAmberBright}
          bold
        />
      )}

      {/* 4. Subtle Divider */}
      <SidebarDivider width={innerWidth} />

      {/* 5. Table Column Headers */}
      <SidebarTableRow
        columns={[
          { text: "#", width: idxWidth, color: theme.colors.retroCyanBright, bold: true },
          { text: "INTERN", width: nameWidth, color: theme.colors.retroSlateDark },
          { text: "EMAIL", width: emailWidth, color: theme.colors.retroSlateDark },
          { text: "STATUS", width: statusWidth, color: theme.colors.retroSlateDark },
        ]}
        width={innerWidth}
      />

      {/* 6. Content */}
      {loading && (
        <SidebarLoadingRow suffix="cohort team & peers" width={innerWidth} />
      )}

      {!loading && peers.length === 0 && (
        <>
          <SidebarLine
            text="No other accepted interns in this track yet."
            width={innerWidth}
            color={theme.colors.retroSlateDark}
          />
          <SidebarLine
            text="New group members will appear here as approved."
            width={innerWidth}
            color={theme.colors.retroSlateDark}
          />
        </>
      )}

      {!loading &&
        visiblePeers.map((peer, idx) => {
          const actualIdx = scrollOffset + idx + 1;
          return (
            <SidebarTableRow
              key={peer.id || peer.email || actualIdx}
              columns={[
                { text: String(actualIdx), width: idxWidth, color: theme.colors.retroSlateDark },
                { text: peer.name, width: nameWidth, color: theme.colors.white, bold: true },
                { text: peer.email || "—", width: emailWidth, color: theme.colors.retroSlate },
                { text: peer.status || "Active", width: statusWidth, color: theme.colors.retroGreenBright },
              ]}
              width={innerWidth}
            />
          );
        })}

      {/* Fill empty rows to guarantee 100% solid VS Code background coverage */}
      <SidebarEmptyRows count={Math.max(0, innerHeight - fixedChrome - contentRowsCount)} width={innerWidth} />

      {/* 7. Clean Status Footer */}
      <SidebarTwoColumnRow
        left={{
          text: `Peers ${peers.length ? scrollOffset + 1 : 0}-${Math.min(
            peers.length,
            scrollOffset + maxVisiblePeers
          )} of ${peers.length}`,
          color: theme.colors.retroSlateDark,
        }}
        right={{ text: "'close' hide · PgUp/PgDn", color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />
    </SidebarContainer>
  );
};
