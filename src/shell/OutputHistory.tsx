import React from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";

export interface OutputLine {
  id: string;
  text: string;
  type?: "info" | "error" | "success" | "warning" | "dim" | "default";
}

interface OutputHistoryProps {
  history: OutputLine[];
}

function getColor(type: OutputLine["type"]): string {
  switch (type) {
    case "info":    return theme.colors.info;
    case "error":   return theme.colors.error;
    case "success": return theme.colors.success;
    case "warning": return theme.colors.warning;
    case "dim":     return theme.colors.dim;
    default:        return theme.colors.text;
  }
}

export const OutputHistory: React.FC<OutputHistoryProps> = ({ history }) => {
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
