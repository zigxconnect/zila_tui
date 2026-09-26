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
          tag: "[OK] ",
          tagColor: theme.colors.retroGreenBright,
          bold: false,
        };
      case "error":
        return {
          color: theme.colors.error,
          tag: "[FAIL] ",
          tagColor: theme.colors.errorBright,
          bold: true,
        };
      case "warning":
        return {
          color: theme.colors.warning,
          tag: "[WARN] ",
          tagColor: theme.colors.retroAmberBright,
          bold: false,
        };
      case "info":
        return {
          color: theme.colors.info,
          tag: "[INFO] ",
          tagColor: theme.colors.retroCyanBright,
          bold: false,
        };
      case "dim":
        return {
          color: theme.colors.dim,
          tag: "",
          tagColor: theme.colors.dim,
          bold: false,
        };
      case "command":
        return {
          color: theme.colors.accentBright,
          tag: "› ",
          tagColor: theme.colors.retroCyan,
          bold: true,
        };
      default:
        return {
          color: theme.colors.text,
          tag: "",
          tagColor: theme.colors.muted,
          bold: false,
        };
    }
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {history.map((line) => {
        const style = getLineStyle(line.type);

        return (
          <Box key={line.id} flexDirection="row">
            {style.tag ? (
              <Text color={style.tagColor} bold={style.bold}>
                {style.tag}
              </Text>
            ) : null}
            <Text
              color={style.color}
              bold={style.bold}
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
