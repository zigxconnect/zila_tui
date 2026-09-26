import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface RetroMeterProps {
  label?: string;
  value: number;
  max?: number;
  width?: number;
  style?: "blocks" | "equals" | "hashes" | "dots";
  color?: keyof typeof theme.colors;
  showPercent?: boolean;
}

export const RetroMeter: React.FC<RetroMeterProps> = ({
  label,
  value,
  max = 100,
  width = 20,
  style = "blocks",
  color = "accent",
  showPercent = true,
}) => {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(Math.max(0, value / safeMax), 1);
  const percent = Math.round(ratio * 100);
  const filledCount = Math.round(ratio * width);
  const emptyCount = Math.max(0, width - filledCount);

  let fillChar = "■";
  let emptyChar = "░";

  if (style === "equals") {
    fillChar = "=";
    emptyChar = " ";
  } else if (style === "hashes") {
    fillChar = "#";
    emptyChar = ".";
  } else if (style === "dots") {
    fillChar = "•";
    emptyChar = "·";
  }

  const activeColor = theme.colors[color] || theme.colors.accent;

  return (
    <Box flexDirection="row" alignItems="center">
      {label && (
        <Box marginRight={1}>
          <Text color={theme.colors.muted}>{label}: </Text>
        </Box>
      )}
      <Text color={theme.colors.retroSlateDark}>[</Text>
      <Text color={activeColor}>{fillChar.repeat(filledCount)}</Text>
      <Text color={theme.colors.dimmer}>{emptyChar.repeat(emptyCount)}</Text>
      <Text color={theme.colors.retroSlateDark}>]</Text>
      {showPercent && (
        <Box marginLeft={1}>
          <Text color={theme.colors.textBright} bold>{percent}%</Text>
        </Box>
      )}
    </Box>
  );
};
