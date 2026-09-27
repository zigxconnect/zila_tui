import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";

interface ExitScreenProps {
  message?: string;
  onExited: () => void;
}

const SHUTDOWN_STEPS = [
  "FLUSHING RESPONSE CACHE TO DISK",
  "CLOSING AI AGENT SESSION",
  "DISCONNECTING FROM ZIGEX-NET",
  "WRITING SESSION LOG",
  "SYNCING WORKSPACE STATE",
];

export const ExitScreen: React.FC<ExitScreenProps> = ({ message, onExited }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (frame >= SHUTDOWN_STEPS.length + 3) {
      const timer = setTimeout(onExited, 300);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setFrame((f) => f + 1);
    }, 55);
    return () => clearTimeout(timer);
  }, [frame, onExited]);

  const visibleSteps = SHUTDOWN_STEPS.slice(0, Math.max(0, frame - 1));
  const showFinal = frame >= SHUTDOWN_STEPS.length + 2;

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Notice message if provided */}
      {message && (
        <Box marginBottom={1} flexDirection="row" gap={1}>
          <Text color={theme.colors.retroAmberBright} bold>{"[NOTICE]"}</Text>
          <Text color={theme.colors.white}>{message}</Text>
        </Box>
      )}

      {/* ═══ LOGOUT FRAME ═══ */}
      <Box flexDirection="column" borderStyle="double" borderColor={theme.colors.retroCyan} paddingX={2} paddingY={1}>

        {/* Header */}
        <Box flexDirection="row" alignItems="center" marginBottom={1}>
          <Text color={theme.colors.retroCyanBright} bold>{"[ ZILA WORKSTATION — SESSION TERMINATION ]"}</Text>
        </Box>

        {/* Session telemetry */}
        <Box flexDirection="column" gap={0} marginBottom={1}>
          {[
            { k: "USER    ", v: "intern@zigex.local",          c: theme.colors.white },
            { k: "STATUS  ", v: "NORMAL SHUTDOWN  (CODE 0)",   c: theme.colors.retroGreenBright },
            { k: "CACHE   ", v: "STATE FLUSHED → ~/.zila/cache.json", c: theme.colors.retroCyan },
            { k: "HOST    ", v: "zigex-net-cluster [DISCONNECTED]",   c: theme.colors.retroSlate },
            { k: "SESSION ", v: new Date().toISOString().replace("T", "  ").slice(0, 22), c: theme.colors.retroSlateDark },
          ].map(({ k, v, c }) => (
            <Box key={k} flexDirection="row" gap={1}>
              <Text color={theme.colors.retroSlateDark}>{k}</Text>
              <Text color={theme.colors.retroPanel}>{"·"}</Text>
              <Text color={c}>{v}</Text>
            </Box>
          ))}
        </Box>

        {/* Shutdown sequence */}
        <Box flexDirection="column" gap={0}>
          <Box flexDirection="row" marginBottom={0}>
            <Text color={theme.colors.retroCyan}>{"─── SHUTDOWN SEQUENCE "}</Text>
            <Text color={theme.colors.retroPanel}>{"─".repeat(26)}</Text>
          </Box>
          {visibleSteps.map((step, i) => (
            <Box key={i} flexDirection="row" gap={1}>
              <Text color={theme.colors.retroGreenBright} bold>{"[ OK ]"}</Text>
              <Text color={theme.colors.retroSlateDark}>{step}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Goodbye message */}
      {showFinal && (
        <Box marginTop={1} flexDirection="row" gap={1}>
          <Text color={theme.colors.retroCyan}>{"══"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"Connection to ZIGEX terminal closed. Goodbye."}</Text>
          <Text color={theme.colors.retroCyan}>{"══"}</Text>
        </Box>
      )}
    </Box>
  );
};
