import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface RetroStatusBarProps {
  version?: string;
  network?: "online" | "offline" | "syncing";
  currentScreen?: string;
  shortcuts?: string[];
}

export const RetroStatusBar: React.FC<RetroStatusBarProps> = ({
  version = "v0.3.0",
  network = "online",
  currentScreen = "READY",
  shortcuts = ["F1:HELP", "F2:INIT", "^L:CLR", "^C:EXIT"],
}) => {
  const netColor =
    network === "online"  ? theme.colors.retroGreenBright :
    network === "syncing" ? theme.colors.retroAmberBright :
                            theme.colors.error;

  const netLabel = network.toUpperCase();

  return (
    <Box flexDirection="column">
      {/* ════ TOP BAR ════ */}
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Left: identity + state */}
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text color={theme.colors.retroCyan}>{"╔═["}</Text>
          <Text color={theme.colors.retroCyanBright} bold>{"LIL-ZILA"}</Text>
          <Text color={theme.colors.retroSlate}>{version}</Text>
          <Text color={theme.colors.retroCyan}>{"]"}</Text>
          <Text color={theme.colors.retroPanel}>{"║"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"STATE:"}</Text>
          <Text color={theme.colors.retroAmberBright} bold>{currentScreen}</Text>
        </Box>

        {/* Center: network */}
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text color={theme.colors.retroSlateDark}>{"NET:"}</Text>
          <Text color={theme.colors.retroPanel}>{"["}</Text>
          <Text color={netColor} bold>{netLabel}</Text>
          <Text color={theme.colors.retroPanel}>{"]"}</Text>
        </Box>

        {/* Right: function key shortcuts */}
        <Box flexDirection="row" alignItems="center" gap={0}>
          {shortcuts.map((sc, i) => (
            <Box key={sc} flexDirection="row">
              {i > 0 && <Text color={theme.colors.retroPanel}>{" │ "}</Text>}
              <Text color={theme.colors.retroCyanBright} bold>{sc}</Text>
            </Box>
          ))}
          <Text color={theme.colors.retroCyan}>{"]=╗"}</Text>
        </Box>
      </Box>

      {/* ════ SEPARATOR ════ */}
      <Box>
        <Text color={theme.colors.retroCyan}>
          {"╚"}<Text color={theme.colors.retroPanel}>{"═".repeat(70)}</Text>{"╝"}
        </Text>
      </Box>
    </Box>
  );
};
