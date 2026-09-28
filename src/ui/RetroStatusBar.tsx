import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import { RetroClock } from "./RetroClock.js";

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
    network === "syncing" ? theme.colors.retroAmber :
                            theme.colors.error;

  return (
    <Box flexDirection="column">
      {/* Single clean bar */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">

        {/* Left: identity */}
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{version}</Text>
          <Text color={theme.colors.retroSlateDark}>{"·"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"STATE:"}</Text>
          <Text color={theme.colors.white} bold>{currentScreen}</Text>
          <Text color={theme.colors.retroSlateDark}>{"·"}</Text>
          <RetroClock color="retroSlateDark" showSeconds />
        </Box>

        {/* Right: net + shortcuts */}
        <Box flexDirection="row" gap={2} alignItems="center">
          <Text color={netColor}>{network.toUpperCase()}</Text>
          <Text color={theme.colors.retroSlateDark}>{"·"}</Text>
          {shortcuts.map((sc, i) => (
            <Box key={sc} flexDirection="row">
              {i > 0 && <Text color={theme.colors.retroSlateDark}>{" "}</Text>}
              <Text color={theme.colors.retroBlueBright}>{sc}</Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Thin separator */}
      <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
    </Box>
  );
};
