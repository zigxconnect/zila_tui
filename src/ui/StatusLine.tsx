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

function renderIcon(status: StatusType): React.ReactElement {
  switch (status) {
    case "loading":
      return <Spinner />;
    case "success":
      return <Text color={theme.colors.success}>{theme.symbols.tick}</Text>;
    case "error":
      return <Text color={theme.colors.error}>{theme.symbols.cross}</Text>;
    case "warning":
      return <Text color={theme.colors.warning}>{theme.symbols.warning}</Text>;
    case "skipped":
      return <Text color={theme.colors.dim}>{theme.symbols.ellipsis}</Text>;
    default: // pending
      return <Text color={theme.colors.dim}>{theme.symbols.bullet}</Text>;
  }
}

function labelColor(status: StatusType): string {
  switch (status) {
    case "success":
      return theme.colors.white;
    case "loading":
      return theme.colors.primary;
    case "error":
      return theme.colors.error;
    case "warning":
      return theme.colors.warning;
    case "skipped":
      return theme.colors.dim;
    default:
      return theme.colors.muted;
  }
}

function detailColor(status: StatusType): string {
  switch (status) {
    case "error":
      return theme.colors.error;
    case "warning":
      return theme.colors.warning;
    default:
      return theme.colors.muted;
  }
}

export const StatusLine: React.FC<StatusLineProps> = ({
  status,
  label,
  detail,
}) => (
  <Box flexDirection="column" marginBottom={0}>
    {/* Primary row */}
    <Box flexDirection="row">
      <Box width={3}>{renderIcon(status)}</Box>
      <Text color={labelColor(status)} bold={status === "loading"}>
        {label}
      </Text>
      {detail && status !== "error" && status !== "warning" && (
        <Text color={theme.colors.muted}> — {detail}</Text>
      )}
    </Box>
    {/* Error / warning detail gets its own indented line for readability */}
    {detail && (status === "error" || status === "warning") && (
      <Box marginLeft={3}>
        <Text color={detailColor(status)}>{detail}</Text>
      </Box>
    )}
  </Box>
);
