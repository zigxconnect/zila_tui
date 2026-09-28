import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";

interface ExitScreenProps {
  message?: string;
  onExited: () => void;
}

const SHUTDOWN_STEPS = [
  "Flushing response cache to disk",
  "Closing AI agent session",
  "Writing session log",
  "Disconnecting from Zigex-Net",
];

export const ExitScreen: React.FC<ExitScreenProps> = ({ message, onExited }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (frame >= SHUTDOWN_STEPS.length + 2) {
      const timer = setTimeout(onExited, 250);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setFrame((f) => f + 1);
    }, 45);
    return () => clearTimeout(timer);
  }, [frame, onExited]);

  const visibleSteps = SHUTDOWN_STEPS.slice(0, Math.max(0, frame - 1));
  const showFinal = frame >= SHUTDOWN_STEPS.length + 1;

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Top rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{"session termination"}</Text>
        </Box>
        <Text color={theme.colors.retroGreenBright}>{"normal shutdown (0)"}</Text>
      </Box>

      {/* Divider */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {message && (
        <Box marginBottom={1} flexDirection="row" gap={1}>
          <Text color={theme.colors.warning}>{"Notice:"}</Text>
          <Text color={theme.colors.white}>{message}</Text>
        </Box>
      )}

      {/* Telemetry info */}
      <Box flexDirection="column" gap={0} marginBottom={1}>
        <Box flexDirection="row" gap={2}>
          <Box width={16}>
            <Text color={theme.colors.retroSlateDark}>{"User:"}</Text>
          </Box>
          <Text color={theme.colors.white}>{"intern@zigex.local"}</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Box width={16}>
            <Text color={theme.colors.retroSlateDark}>{"Cache:"}</Text>
          </Box>
          <Text color={theme.colors.white}>{"Flushed to ~/.zila/cache.json"}</Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          <Box width={16}>
            <Text color={theme.colors.retroSlateDark}>{"Session Time:"}</Text>
          </Box>
          <Text color={theme.colors.retroSlateDark}>{new Date().toLocaleTimeString()}</Text>
        </Box>
      </Box>

      {/* Steps */}
      <Box flexDirection="column" gap={0}>
        {visibleSteps.map((step, i) => (
          <Box key={i} flexDirection="row" gap={1}>
            <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
            <Text color={theme.colors.retroSlateDark}>{step}</Text>
          </Box>
        ))}
      </Box>

      {/* Bottom rule */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>

      {/* Goodbye message */}
      {showFinal && (
        <Box flexDirection="row" gap={1}>
          <Text color={theme.colors.retroSlateDark}>{"Connection to Zigex terminal closed. Goodbye."}</Text>
        </Box>
      )}
    </Box>
  );
};
