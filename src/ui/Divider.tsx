import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface DividerProps {
  label?: string;
  width?: number;
  style?: "single" | "double" | "dashed" | "dotted" | "ascii";
  color?: keyof typeof theme.colors;
}

export const Divider: React.FC<DividerProps> = ({
  label,
  width = 72,
  style = "single",
  color = "retroBlue",
}) => {
  const char =
    style === "double"
      ? theme.boxDouble.horizontal
      : style === "dashed"
      ? "-"
      : style === "dotted"
      ? theme.dots.leader
      : style === "ascii"
      ? "-"
      : theme.boxSingle.horizontal;

  const borderColor = theme.colors[color] || theme.colors.retroBlue;

  if (!label) {
    return (
      <Box marginY={0}>
        <Text color={borderColor}>
          {char.repeat(width)}
        </Text>
      </Box>
    );
  }

  const sideLen = 3;
  const labelLength = label.length + 4; // for "[ " and " ]"
  const rightLen = Math.max(2, width - sideLen - labelLength);

  return (
    <Box flexDirection="row" alignItems="center" marginY={0}>
      <Text color={borderColor}>{char.repeat(sideLen)}</Text>
      <Text color={borderColor}>{"[ "}</Text>
      <Text color={theme.colors.white} bold>{label}</Text>
      <Text color={borderColor}>{" ]"}</Text>
      <Text color={borderColor}>{char.repeat(rightLen)}</Text>
    </Box>
  );
};
