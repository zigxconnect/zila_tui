import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

interface DividerProps {
  label?: string;
  width?: number;
}

export const Divider: React.FC<DividerProps> = ({ label, width = 48 }) => {
  if (!label) {
    return (
      <Text color={theme.colors.border}>
        {theme.symbols.line.repeat(width)}
      </Text>
    );
  }

  const sideLen = 3;
  const midLen = width - sideLen * 2 - label.length - 2; // 2 spaces around label
  const rightLen = Math.max(0, midLen);

  return (
    <Box flexDirection="row" alignItems="center">
      <Text color={theme.colors.border}>{theme.symbols.line.repeat(sideLen)} </Text>
      <Text color={theme.colors.muted} bold>{label.toUpperCase()}</Text>
      <Text color={theme.colors.border}> {theme.symbols.line.repeat(rightLen)}</Text>
    </Box>
  );
};
