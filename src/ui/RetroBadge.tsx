import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface RetroBadgeProps {
  label: string;
  variant?: "cyan" | "green" | "amber" | "magenta" | "blue" | "sharpBlue" | "slate" | "danger" | "white";
  bold?: boolean;
}

export const RetroBadge: React.FC<RetroBadgeProps> = ({
  label,
  variant = "sharpBlue",
  bold = true,
}) => {
  const colorMap = {
    sharpBlue: theme.colors.retroBlue,
    blue: theme.colors.retroBlueBright,
    cyan: theme.colors.retroCyanBright,
    green: theme.colors.retroGreenBright,
    amber: theme.colors.retroAmberBright,
    magenta: theme.colors.retroMagenta,
    slate: theme.colors.retroSlateDark,
    danger: theme.colors.error,
    white: theme.colors.white,
  };

  const selectedColor = colorMap[variant] || theme.colors.retroBlueBright;

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
      <Text color={theme.colors.retroBlueBright} bold>{keyName}</Text>
      <Text color={theme.colors.retroSlateDark}>:</Text>
      <Text color={theme.colors.white}>{action}</Text>
      <Text color={theme.colors.retroSlateDark}>]</Text>
    </Box>
  );
};
