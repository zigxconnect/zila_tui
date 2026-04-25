// src/ui/Divider.tsx
import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

interface DividerProps {
  label?: string;
  width?: number;
}

export const Divider: React.FC<DividerProps> = ({ label, width = 40 }) => {
  if (!label) {
    return (
      <Text color={theme.colors.border}>
        {theme.symbols.line.repeat(width)}
      </Text>
    );
  }

  return (
    <Box flexDirection="row" alignItems="center" marginY={1}>
      <Text color={theme.colors.border}>
        {theme.symbols.line.repeat(3)}{" "}
      </Text>
      <Text color={theme.colors.muted}>{label.toUpperCase()}</Text>
      <Box flexGrow={1}>
        <Text color={theme.colors.border}>
          {" "}
          {theme.symbols.line.repeat(width)}
        </Text>
      </Box>
    </Box>
  );
};
