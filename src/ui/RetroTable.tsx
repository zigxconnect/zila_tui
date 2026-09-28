import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface ColumnDef {
  key: string;
  header: string;
  width: number;
  align?: "left" | "right" | "center";
}

export interface RetroTableProps {
  columns: ColumnDef[];
  data: Record<string, string | number>[];
  title?: string;
  borderColor?: keyof typeof theme.colors;
}

export const RetroTable: React.FC<RetroTableProps> = ({
  columns,
  data,
  title,
  borderColor = "retroBlue",
}) => {
  const color = theme.colors[borderColor] || theme.colors.retroBlue;

  const pad = (text: string, width: number, align: "left" | "right" | "center" = "left"): string => {
    const s = String(text);
    if (s.length >= width) return s.slice(0, width);
    const diff = width - s.length;
    if (align === "right") return " ".repeat(diff) + s;
    if (align === "center") {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return " ".repeat(left) + s + " ".repeat(right);
    }
    return s + " ".repeat(diff);
  };

  return (
    <Box flexDirection="column" marginY={1}>
      {title && (
        <Box marginBottom={1} flexDirection="row" gap={1}>
          <Text color={theme.colors.retroBlue} bold>{"›"}</Text>
          <Text color={theme.colors.white} bold>{title}</Text>
        </Box>
      )}

      {/* Header Row */}
      <Box flexDirection="row">
        <Text color={color}>│ </Text>
        {columns.map((col, idx) => (
          <Box key={col.key} flexDirection="row">
            {idx > 0 && <Text color={color}> │ </Text>}
            <Text color={theme.colors.retroBlueBright} bold>
              {pad(col.header, col.width, col.align)}
            </Text>
          </Box>
        ))}
        <Text color={color}> │</Text>
      </Box>

      {/* Separator */}
      <Box flexDirection="row">
        <Text color={color}>├─</Text>
        {columns.map((col, idx) => (
          <Box key={col.key} flexDirection="row">
            {idx > 0 && <Text color={color}>─┼─</Text>}
            <Text color={color}>{"─".repeat(col.width)}</Text>
          </Box>
        ))}
        <Text color={color}>─┤</Text>
      </Box>

      {/* Data Rows */}
      {data.map((row, rowIdx) => (
        <Box key={rowIdx} flexDirection="row">
          <Text color={color}>│ </Text>
          {columns.map((col, idx) => (
            <Box key={col.key} flexDirection="row">
              {idx > 0 && <Text color={color}> │ </Text>}
              <Text color={theme.colors.white}>
                {pad(String(row[col.key] ?? ""), col.width, col.align)}
              </Text>
            </Box>
          ))}
          <Text color={color}> │</Text>
        </Box>
      ))}

      {/* Bottom border */}
      <Box flexDirection="row">
        <Text color={color}>└─</Text>
        {columns.map((col, idx) => (
          <Box key={col.key} flexDirection="row">
            {idx > 0 && <Text color={color}>─┴─</Text>}
            <Text color={color}>{"─".repeat(col.width)}</Text>
          </Box>
        ))}
        <Text color={color}>─┘</Text>
      </Box>
    </Box>
  );
};

export interface DottedLeaderProps {
  label: string;
  value: string | number;
  width?: number;
  valueColor?: keyof typeof theme.colors;
}

export const DottedLeader: React.FC<DottedLeaderProps> = ({
  label,
  value,
  width = 60,
  valueColor = "white",
}) => {
  const valStr = String(value);
  const dotCount = Math.max(2, width - label.length - valStr.length - 2);
  const valColorHex = theme.colors[valueColor] || theme.colors.white;

  return (
    <Box flexDirection="row" alignItems="center">
      <Text color={theme.colors.retroSlateDark}>{label}</Text>
      <Text color={theme.colors.retroSlateDark}> {"·".repeat(dotCount)} </Text>
      <Text color={valColorHex} bold>{valStr}</Text>
    </Box>
  );
};
