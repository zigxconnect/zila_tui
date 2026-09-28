import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";
import { Spinner } from "./Spinner.js";

export type StatusType =
  | "pending"
  | "loading"
  | "success"
  | "error"
  | "warning"
  | "skipped";

export interface StatusLineProps {
  status: StatusType;
  label: string;
  detail?: string;
}

// 90s-style bracket status tags
const STATUS_TAG: Record<StatusType, { tag: string; color: string }> = {
  pending: { tag: "[    ]",  color: theme.colors.retroSlateDark },
  loading: { tag: "[ >> ]",  color: theme.colors.retroBlueBright },
  success: { tag: "[ OK ]",  color: theme.colors.retroGreenBright },
  error:   { tag: "[FAIL]",  color: theme.colors.error },
  warning: { tag: "[WARN]",  color: theme.colors.retroAmberBright },
  skipped: { tag: "[SKIP]",  color: theme.colors.retroSlateDark },
};

function renderIcon(status: StatusType): React.ReactElement {
  if (status === "loading") {
    return <Spinner style="classic" color={theme.colors.retroBlueBright} />;
  }
  const { tag, color } = STATUS_TAG[status];
  return <Text color={color} bold>{tag}</Text>;
}

function labelColor(status: StatusType): string {
  switch (status) {
    case "success": return theme.colors.white;
    case "loading": return theme.colors.retroBlueBright;
    case "error":   return theme.colors.error;
    case "warning": return theme.colors.retroAmberBright;
    case "skipped": return theme.colors.retroSlateDark;
    default:        return theme.colors.retroSlateDark;
  }
}

function detailColor(status: StatusType): string {
  switch (status) {
    case "error":   return theme.colors.error;
    case "warning": return theme.colors.retroAmber;
    default:        return theme.colors.retroSlateDark;
  }
}

export const StatusLine: React.FC<StatusLineProps> = ({
  status,
  label,
  detail,
}) => (
  <Box flexDirection="column" marginBottom={0}>
    {/* Primary row */}
    <Box flexDirection="row" gap={1}>
      <Box width={7}>{renderIcon(status)}</Box>
      <Text color={labelColor(status)} bold={status === "loading" || status === "success"}>
        {label}
      </Text>
      {detail && status !== "error" && status !== "warning" && (
        <Text color={theme.colors.retroSlateDark}>{" — "}{detail}</Text>
      )}
    </Box>
    {/* Error / warning detail on its own indented line */}
    {detail && (status === "error" || status === "warning") && (
      <Box marginLeft={8}>
        <Text color={detailColor(status)}>{detail}</Text>
      </Box>
    )}
  </Box>
);
