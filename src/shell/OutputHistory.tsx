import React from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";

export interface OutputLine {
  id: string;
  text: string;
  type?: "info" | "error" | "success" | "dim" | "default" | "warning";
}

interface OutputHistoryProps {
  history: OutputLine[];
}

export const OutputHistory: React.FC<OutputHistoryProps> = ({ history }) => {
  const getColor = (type?: string) => {
    switch (type) {
      case "info":
        return theme.colors.primary;
      case "error":
        return theme.colors.error;
      case "success":
        return theme.colors.success;
      case "dim":
        return theme.colors.muted;
      default:
        return theme.colors.white;
    }
  };

  if (history.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {history.map((line) => (
        <Text key={line.id} color={getColor(line.type)}>
          {line.text}
        </Text>
      ))}
    </Box>
  );
};
