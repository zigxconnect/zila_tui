import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export type LogLevel = "ok" | "fail" | "warn" | "info" | "debug" | "note";

export interface RetroLogLineProps {
  level: LogLevel;
  source?: string;
  message: string;
  timestamp?: string;
}

const LEVEL_CONFIG: Record<LogLevel, { tag: string; tagColor: string; msgColor: string }> = {
  ok:    { tag: "[ OK ]",   tagColor: theme.colors.retroGreenBright, msgColor: theme.colors.retroSlate     },
  fail:  { tag: "[FAIL]",   tagColor: theme.colors.error,            msgColor: theme.colors.error           },
  warn:  { tag: "[WARN]",   tagColor: theme.colors.retroAmberBright, msgColor: theme.colors.retroAmber      },
  info:  { tag: "[INFO]",   tagColor: theme.colors.retroCyanBright,  msgColor: theme.colors.retroSlate      },
  debug: { tag: "[DBUG]",   tagColor: theme.colors.retroSlateDark,   msgColor: theme.colors.retroSlateDark  },
  note:  { tag: "[NOTE]",   tagColor: theme.colors.retroMagenta,     msgColor: theme.colors.retroSlate      },
};

/**
 * RetroLogLine — Renders a single vintage syslog-style output line.
 *
 * Example:
 *   [ OK ]  BOOT  ·  ZILA-ROM v2.4 initialized successfully
 *   [WARN]  NET   ·  Connection latency above threshold
 */
export const RetroLogLine: React.FC<RetroLogLineProps> = ({
  level,
  source,
  message,
  timestamp,
}) => {
  const { tag, tagColor, msgColor } = LEVEL_CONFIG[level] || LEVEL_CONFIG.info;

  return (
    <Box flexDirection="row" gap={1} alignItems="center">
      {/* Timestamp (optional) */}
      {timestamp && (
        <Text color={theme.colors.retroSlateDark}>{timestamp}</Text>
      )}

      {/* Level tag */}
      <Text color={tagColor} bold>{tag}</Text>

      {/* Source system label */}
      {source && (
        <>
          <Text color={theme.colors.retroSlateDark}>{source.toUpperCase().padEnd(6)}</Text>
          <Text color={theme.colors.retroPanel}>{"·"}</Text>
        </>
      )}

      {/* Message */}
      <Text color={msgColor}>{message}</Text>
    </Box>
  );
};
