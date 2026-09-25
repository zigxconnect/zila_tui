import React from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";

export type OutputLine = {
  id: string;
  text: string;
  type: "default" | "success" | "error" | "warning" | "info" | "dim" | "command";
};

interface OutputHistoryProps {
  history: OutputLine[];
}

export const OutputHistory: React.FC<OutputHistoryProps> = ({ history }) => {
  if (history.length === 0) return null;

  const getLineStyle = (type: OutputLine["type"]) => {
    switch (type) {
      case "success":
        return {
          color: theme.colors.success,
          icon: theme.symbols.tick,
          bold: false,
        };
      case "error":
        return {
          color: theme.colors.error,
          icon: theme.symbols.cross,
          bold: true,
        };
      case "warning":
        return {
          color: theme.colors.warning,
          icon: theme.symbols.warning,
          bold: false,
        };
      case "info":
        return {
          color: theme.colors.info,
          icon: theme.symbols.info,
          bold: false,
        };
      case "dim":
        return {
          color: theme.colors.dim,
          icon: null,
          bold: false,
        };
      case "command":
        return {
          color: theme.colors.primary,
          icon: theme.symbols.pointerFancy,
          bold: true,
        };
      default:
        return {
          color: theme.colors.text,
          icon: null,
          bold: false,
        };
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {history.map((line) => {
        const style = getLineStyle(line.type);

        return (
          <Box key={line.id}>
            {style.icon && (
              <Text color={style.color} bold={style.bold}>
                {style.icon}{" "}
              </Text>
            )}
            <Text color={style.color} bold={style.bold} dimColor={line.type === "dim"}>
              {line.text}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};
