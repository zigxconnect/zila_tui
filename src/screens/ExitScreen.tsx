import React, { useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { Divider } from "../ui/Divider.js";

interface ExitScreenProps {
  message?: string;
  onExited: () => void;
}

export const ExitScreen: React.FC<ExitScreenProps> = ({
  message,
  onExited,
}) => {
  useEffect(() => {
    const id = setTimeout(onExited, theme.timing.exitDelayMs);
    return () => clearTimeout(id);
  }, [onExited]);

  const goodbye = message ?? "Goodbye. Come back and build something great.";

  return (
    <Box flexDirection="column" marginY={1} paddingX={1}>
      <Divider width={44} />

      <Box marginTop={1} marginBottom={1} flexDirection="column" gap={0}>
        <Text color={theme.colors.white}>{goodbye}</Text>

        <Box marginTop={1} flexDirection="row">
          <Text color={theme.colors.primary}>ZILA v0.2.0</Text>
          <Text color={theme.colors.dim}> · Zigex Open Source Initiative</Text>
        </Box>
      </Box>

      <Divider width={44} />
    </Box>
  );
};
