import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { theme } from "../ui/theme.js";
import {
  loadLocalChatSessions,
  fetchRemoteChatSessions,
  type LocalChatSession,
} from "../utils/chatHistory.js";
import {
  SidebarContainer,
  SidebarTwoColumnRow,
  SidebarDivider,
  SidebarLine,
  SidebarLoadingRow,
  SidebarEmptyRows,
} from "../ui/sidebarLayout.js";

interface HistorySidebarProps {
  width?: number;
  height?: number;
  isFocused?: boolean;
  currentSessionId?: string;
  onSelectSession: (session: LocalChatSession) => void;
  onClose: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  width,
  height,
  isFocused = false,
  currentSessionId,
  onSelectSession,
  onClose,
}) => {
  const { stdout } = useStdout();
  const termCols = stdout?.columns || process.stdout.columns || 120;
  const termRows = stdout?.rows || process.stdout.rows || 36;

  const effectiveWidth = width ?? Math.max(40, Math.floor(termCols * 0.48));
  const effectiveHeight = height ?? Math.max(18, termRows - 6);
  const innerWidth = Math.max(20, effectiveWidth - 2);

  const [sessions, setSessions] = useState<LocalChatSession[]>(() => loadLocalChatSessions());
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchRemoteChatSessions()
      .then((remoteSessions) => {
        if (!active) return;
        if (remoteSessions && remoteSessions.length > 0) {
          setSessions((prev) => {
            const map = new Map<string, LocalChatSession>();
            for (const s of prev) map.set(s.id, s);
            for (const r of remoteSessions) {
              if (!map.has(r.id)) {
                map.set(r.id, r);
              }
            }
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            );
          });
        }
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

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(Math.max(0, sessions.length - 1), prev + 1));
      return;
    }
    if (key.return) {
      const picked = sessions[selectedIndex];
      if (picked) {
        onSelectSession(picked);
      }
      return;
    }
    if (key.escape || (input === "q" && !key.ctrl)) {
      onClose();
      return;
    }
  });

  const viewportHeight = Math.max(5, effectiveHeight - 7);
  const visibleSessions = sessions.slice(
    Math.max(0, Math.min(selectedIndex - 3, sessions.length - viewportHeight)),
    Math.max(0, Math.min(selectedIndex - 3, sessions.length - viewportHeight)) + viewportHeight,
  );

  return (
    <SidebarContainer width={effectiveWidth} height={effectiveHeight} isFocused={isFocused}>
      {/* Header */}
      <SidebarTwoColumnRow
        left={{ text: "◈ CHAT HISTORY", color: theme.colors.retroCyanBright, bold: true }}
        right={{
          text: loading ? "Syncing..." : `${sessions.length} SESSIONS`,
          color: theme.colors.retroSlateDark,
        }}
        width={innerWidth}
      />
      <SidebarTwoColumnRow
        left={{ text: "Press Enter to resume", color: theme.colors.retroSlateDark }}
        right={{ text: "Neon DB / Local", color: theme.colors.retroSlateDark }}
        width={innerWidth}
      />
      <SidebarDivider width={innerWidth} />

      {/* Loading state */}
      {loading && sessions.length === 0 && (
        <SidebarLoadingRow suffix="chat history sessions" width={innerWidth} />
      )}

      {/* Sessions List */}
      {!loading && sessions.length === 0 ? (
        <Box flexDirection="column" paddingX={1} paddingTop={1}>
          <Text color={theme.colors.retroSlateDark}>
            No previous chat sessions found.
          </Text>
          <Text color={theme.colors.retroSlateDark}>
            Start asking questions to build your history!
          </Text>
        </Box>
      ) : (
        visibleSessions.map((session) => {
          const isSelected = sessions[selectedIndex]?.id === session.id;
          const isActive = session.id === currentSessionId;
          const dateStr = session.updatedAt
            ? new Date(session.updatedAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })
            : "";
          const msgCount = session.messages ? session.messages.length : 0;
          const prefix = isSelected ? "❯ " : "  ";
          const title = session.title || "Untitled Session";
          const tag = isActive ? " [active]" : "";

          return (
            <SidebarTwoColumnRow
              key={session.id}
              left={{
                text: `${prefix}${title}${tag}`,
                color: isSelected
                  ? theme.colors.white
                  : isActive
                  ? theme.colors.retroCyanBright
                  : theme.colors.text,
                bold: isSelected || isActive,
              }}
              right={{
                text: `(${msgCount}) ${dateStr}`,
                color: isSelected ? theme.colors.retroCyanBright : theme.colors.retroSlateDark,
              }}
              width={innerWidth}
            />
          );
        })
      )}

      <SidebarEmptyRows
        count={Math.max(
          0,
          viewportHeight - (sessions.length === 0 ? 2 : visibleSessions.length),
        )}
        width={innerWidth}
      />

      {/* Footer */}
      <SidebarDivider width={innerWidth} />
      <SidebarTwoColumnRow
        left={{ text: "↑/↓ navigate · Enter open", color: theme.colors.retroSlateDark }}
        right={{ text: "Tab chat · Esc close", color: theme.colors.retroCyanBright }}
        width={innerWidth}
      />
    </SidebarContainer>
  );
};
