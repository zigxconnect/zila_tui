import React, { useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { Divider } from "../ui/Divider.js";

interface ExitScreenProps {
  message?: string;
  onExited: () => void;
}

export const ExitScreen: React.FC<ExitScreenProps> = ({ message, onExited }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onExited();
    }, theme.timing.exitDelay);
    return () => clearTimeout(timer);
  }, [onExited]);

  const displayMessage = message || "Goodbye. Come back and build something great.";
  
  return (
    <Box flexDirection="column" marginY={1}>
      <Divider width={35} />
      <Box marginY={1} flexDirection="column">
        <Text color={theme.colors.white}>
          {displayMessage}
        </Text>
        <Box marginTop={1} flexDirection="row">
          <Text color={theme.colors.primary}>ZILA v0.1.0 </Text>
          <Text color={theme.colors.dim}>· Zigex Open Source Initiative</Text>
        </Box>
      </Box>
      <Divider width={35} />
    </Box>
  );
};
