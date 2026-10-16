import React, { useState, useEffect } from "react";
import { Box, Text, useStdout, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { ZigexLoader } from "../ui/Spinner.js";
import { loadAuth, zilaApi } from "../utils/auth.js";
import { getActiveCohort } from "../utils/activeCohort.js";

interface GroupSidebarProps {
  width?: number;
  height?: number;
  scrollOffset?: number;
}

interface PeerItem {
  id?: string;
  name: string;
  email: string;
  role?: string;
  status?: string;
  points?: number;
}

export const GroupSidebar: React.FC<GroupSidebarProps> = ({
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
  const [cohortName, setCohortName] = useState<string>("My Cohort");
  const [supervisor, setSupervisor] = useState<{ name: string; email?: string } | null>(null);
  const [peers, setPeers] = useState<PeerItem[]>([]);

  useEffect(() => {
    let active = true;
    const activeCohort = getActiveCohort();
    const auth = loadAuth();
    const myEmail = (auth?.email || "").toLowerCase();

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

  const maxVisiblePeers = Math.max(3, effectiveHeight - 8);

  useInput((_input, key) => {
    if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - 5));
    } else if (key.pageDown) {
      const maxScroll = Math.max(0, peers.length - maxVisiblePeers);
      setScrollOffset((prev) => Math.min(maxScroll, prev + 5));
    }
  });

  const visiblePeers = peers.slice(scrollOffset, scrollOffset + maxVisiblePeers);
  const innerWidth = Math.max(20, effectiveWidth - 2);

  const idxWidth = 4;
  const statusWidth = 10;
  const emailWidth = Math.max(14, Math.floor((innerWidth - idxWidth - statusWidth) * 0.5));
  const nameWidth = Math.max(12, innerWidth - idxWidth - emailWidth - statusWidth - 4);

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
            👥 COHORT TEAM
          </Text>
        </Box>
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroGreenBright} bold>
            ● PEER ROSTER
          </Text>
        </Box>
      </Box>

      {/* Subheader */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text color={theme.colors.retroSlateDark} wrap="truncate">
          {cohortName.slice(0, effectiveWidth - 18)}
        </Text>
        <Text color={theme.colors.retroSlateDark}>
          {peers.length} active peers
        </Text>
      </Box>

      {/* Supervisor banner */}
      {supervisor && (
        <Box flexDirection="row" gap={1} marginTop={0}>
          <Text color={theme.colors.retroAmberBright} bold>
            Supervisor:
          </Text>
          <Text color={theme.colors.white} wrap="truncate">
            {supervisor.name} {supervisor.email ? `<${supervisor.email}>` : ""}
          </Text>
        </Box>
      )}

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>
        {"─".repeat(innerWidth)}
      </Text>

      {/* Table Column Headers */}
      <Box flexDirection="row" gap={1}>
        <Box width={idxWidth}>
          <Text color={theme.colors.retroBlueBright} bold>
            #
          </Text>
        </Box>
        <Box width={nameWidth}>
          <Text color={theme.colors.retroSlateDark}>
            INTERN
          </Text>
        </Box>
        <Box width={emailWidth}>
          <Text color={theme.colors.retroSlateDark}>
            EMAIL
          </Text>
        </Box>
        <Box width={statusWidth}>
          <Text color={theme.colors.retroSlateDark}>
            STATUS
          </Text>
        </Box>
      </Box>

      {/* Peer Rows */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {loading && (
          <Box paddingY={1}>
            <ZigexLoader suffix="cohort team & peers" />
          </Box>
        )}

        {!loading && peers.length === 0 && (
          <Box flexDirection="column" paddingY={1}>
            <Text color={theme.colors.retroSlateDark}>
              No other accepted interns in this track yet.
            </Text>
            <Text color={theme.colors.retroSlateDark}>
              New group members will appear here as applications are approved.
            </Text>
          </Box>
        )}

        {!loading &&
          visiblePeers.map((peer, idx) => {
            const actualIdx = scrollOffset + idx + 1;
            return (
              <Box key={peer.id || peer.email || actualIdx} flexDirection="row" gap={1}>
                <Box width={idxWidth}>
                  <Text color={theme.colors.retroSlateDark}>
                    {actualIdx}
                  </Text>
                </Box>
                <Box width={nameWidth}>
                  <Text color={theme.colors.white} bold wrap="truncate">
                    {peer.name.slice(0, nameWidth)}
                  </Text>
                </Box>
                <Box width={emailWidth}>
                  <Text color={theme.colors.retroSlate} wrap="truncate">
                    {peer.email || "—"}
                  </Text>
                </Box>
                <Box width={statusWidth}>
                  <Text color={theme.colors.retroGreenBright} wrap="truncate">
                    {peer.status || "Active"}
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
          Peers {peers.length ? scrollOffset + 1 : 0}-{Math.min(peers.length, scrollOffset + maxVisiblePeers)} of {peers.length}
        </Text>
        <Text color={theme.colors.retroCyanBright} dimColor>
          'close' to hide · PgUp/PgDn
        </Text>
      </Box>
    </Box>
  );
};
