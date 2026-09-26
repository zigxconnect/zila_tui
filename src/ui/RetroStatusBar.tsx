import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface RetroStatusBarProps {
  version?: string;
  network?: "online" | "offline" | "syncing";
  currentScreen?: string;
  shortcuts?: string[];
  borderColor?: keyof typeof theme.colors;
}

export const RetroStatusBar: React.FC<RetroStatusBarProps> = ({
  version = "v0.3.0",
  network = "online",
  currentScreen = "READY",
  shortcuts = ["F1:HELP", "TAB:NAV", "^C:EXIT"],
  borderColor = "border",
}) => {
  const netColor =
    network === "online"
      ? theme.colors.retroGreen
      : network === "syncing"
      ? theme.colors.retroAmber
      : theme.colors.error;

  const netLabel = network.toUpperCase();

  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      borderStyle="single"
      borderColor={theme.colors[borderColor]}
      paddingX={1}
    >
      {/* Left side: System and screen identity */}
      <Box flexDirection="row" alignItems="center">
        <Text color={theme.colors.logoColor} bold>lil-zila</Text>
        <Text color={theme.colors.retroSlateDark}> [</Text>
        <Text color={theme.colors.accent}>{version}</Text>
        <Text color={theme.colors.retroSlateDark}>] </Text>
        <Text color={theme.colors.dim}>│ </Text>
        <Text color={theme.colors.muted}>STATE: </Text>
        <Text color={theme.colors.textBright} bold>{currentScreen}</Text>
      </Box>

      {/* Middle side: Network telemetry */}
      <Box flexDirection="row" alignItems="center">
        <Text color={theme.colors.muted}>NET: </Text>
        <Text color={theme.colors.retroSlateDark}>[</Text>
        <Text color={netColor} bold>{netLabel}</Text>
        <Text color={theme.colors.retroSlateDark}>]</Text>
      </Box>

      {/* Right side: 90s Function key shortcuts */}
      <Box flexDirection="row" alignItems="center">
        {shortcuts.map((sc, i) => (
          <Box key={sc} flexDirection="row">
            {i > 0 && <Text color={theme.colors.dim}> │ </Text>}
            <Text color={theme.colors.retroCyanBright} bold>{sc}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
