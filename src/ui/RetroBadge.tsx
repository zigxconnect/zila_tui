import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface RetroBadgeProps {
  label: string;
  variant?: "cyan" | "green" | "amber" | "magenta" | "blue" | "slate" | "danger";
  bold?: boolean;
}

export const RetroBadge: React.FC<RetroBadgeProps> = ({
  label,
  variant = "cyan",
  bold = true,
}) => {
  const colorMap = {
    cyan: theme.colors.retroCyanBright,
    green: theme.colors.retroGreenBright,
    amber: theme.colors.retroAmberBright,
    magenta: theme.colors.retroMagenta,
    blue: theme.colors.primaryBright,
    slate: theme.colors.retroSlate,
    danger: theme.colors.errorBright,
  };

  const selectedColor = colorMap[variant] || theme.colors.accent;

  return (
    <Box flexDirection="row">
      <Text color={theme.colors.retroSlateDark}>[ </Text>
      <Text color={selectedColor} bold={bold}>
        {label}
      </Text>
      <Text color={theme.colors.retroSlateDark}> ]</Text>
    </Box>
  );
};

export interface FunctionKeyProps {
  keyName: string;
  action: string;
}

export const FunctionKey: React.FC<FunctionKeyProps> = ({ keyName, action }) => {
  return (
    <Box flexDirection="row" marginRight={2}>
      <Text color={theme.colors.retroSlateDark}>[</Text>
      <Text color={theme.colors.retroCyanBright} bold>{keyName}</Text>
      <Text color={theme.colors.dim}>:</Text>
      <Text color={theme.colors.text}>{action}</Text>
      <Text color={theme.colors.retroSlateDark}>]</Text>
    </Box>
  );
};
