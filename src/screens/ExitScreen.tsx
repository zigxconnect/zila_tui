import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";

interface ExitScreenProps {
  message?: string;
  onExited: () => void;
}

export const ExitScreen: React.FC<ExitScreenProps> = ({ message, onExited }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (frame >= 4) {
      const timer = setTimeout(onExited, 350);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setFrame((f) => f + 1);
    }, 60);

    return () => clearTimeout(timer);
  }, [frame, onExited]);

  return (
    <Box flexDirection="column" paddingY={1}>
      {message && (
        <Box marginBottom={1} flexDirection="row">
          <Text color={theme.colors.warning}>[NOTICE] </Text>
          <Text color={theme.colors.textBright}>{message}</Text>
        </Box>
      )}

      {/* 90s Workstation Logout Frame */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.accent}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="row">
          <Text color={theme.colors.accentBright} bold>
            [ ZILA WORKSTATION SESSION TERMINATION ]
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          <Box flexDirection="row">
            <Text color={theme.colors.muted}>USER:      </Text>
            <Text color={theme.colors.textBright} bold>intern@zigex.local</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.muted}>STATUS:    </Text>
            <Text color={theme.colors.retroGreen} bold>NORMAL SHUTDOWN (CODE 0)</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.muted}>CACHE:     </Text>
            <Text color={theme.colors.retroCyan}>STATE FLUSHED TO ~/.zila/cache.json</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.muted}>HOST:      </Text>
            <Text color={theme.colors.dim}>zigex-net-cluster [DISCONNECTED]</Text>
          </Box>
        </Box>
      </Box>

      {/* Vintage terminal teardown message */}
      <Box marginTop={1} flexDirection="row">
        <Text color={theme.colors.dim}>Connection to zigex terminal closed. Goodbye.</Text>
      </Box>
    </Box>
  );
};
