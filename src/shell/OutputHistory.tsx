import React from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { RetroLogLine, type LogLevel } from "../ui/RetroLogLine.js";

export type OutputLine = {
  id: string;
  text: string;
  type: "default" | "success" | "error" | "warning" | "info" | "dim" | "white" | "command";
};

interface OutputHistoryProps {
  history: OutputLine[];
}

function typeToLevel(type: OutputLine["type"]): LogLevel | null {
  switch (type) {
    case "success": return "ok";
    case "error":   return "fail";
    case "warning": return "warn";
    case "info":    return "info";
    case "dim":     return "debug";
    default:        return null; // "default" and "command" rendered inline
  }
}

export const OutputHistory: React.FC<OutputHistoryProps> = ({ history }) => {
  if (history.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {history.map((line) => {
        const level = typeToLevel(line.type);

        // Structured log types — use RetroLogLine
        if (level) {
          return (
            <RetroLogLine
              key={line.id}
              level={level}
              message={line.text}
            />
          );
        }

        // Command echo line — styled as prompt echo
        if (line.type === "command") {
          return (
            <Box key={line.id} flexDirection="row" gap={1}>
              <Text color={theme.colors.retroCyan} bold>{"══["}</Text>
              <Text color={theme.colors.retroAmberBright} bold>{"CMD"}</Text>
              <Text color={theme.colors.retroCyan} bold>{"]▸"}</Text>
              <Text color={theme.colors.white} bold>{line.text}</Text>
            </Box>
          );
        }

        if (line.type === "white") {
          return (
            <Box key={line.id} flexDirection="row" gap={1}>
              <Text color={theme.colors.retroSlateDark}>{"  ·"}</Text>
              <Text color="#FFFFFF" bold>{line.text}</Text>
            </Box>
          );
        }

        // Default / dim — plain text, dimmed
        return (
          <Box key={line.id} flexDirection="row" gap={1}>
            <Text color={theme.colors.retroSlateDark}>{"  ·"}</Text>
            <Text
              color={line.type === "dim" ? theme.colors.retroSlateDark : theme.colors.retroSlate}
              dimColor={line.type === "dim"}
            >
              {line.text}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
