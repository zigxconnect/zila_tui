import React from "react";
import { Box, Text } from "ink";
import stringWidth from "string-width";
import { theme } from "./theme.js";
import { ZigexLoader } from "./Spinner.js";

/**
 * Truncate a string to fit within a given terminal visual width, appending ellipsis if needed.
 */
export function truncateVisual(str: string, maxW: number): string {
  if (maxW <= 0) return "";
  if (stringWidth(str) <= maxW) return str;
  let curr = "";
  for (const ch of str) {
    if (stringWidth(curr + ch + "…") > maxW) break;
    curr += ch;
  }
  return curr + "…";
}

/**
 * Pad or truncate a string so its terminal visual width matches targetWidth exactly.
 */
export function padVisual(str: string, targetWidth: number, align: "left" | "right" = "left"): string {
  if (targetWidth <= 0) return "";
  const sw = stringWidth(str);
  if (sw >= targetWidth) return truncateVisual(str, targetWidth);
  const diff = targetWidth - sw;
  return align === "right" ? " ".repeat(diff) + str : str + " ".repeat(diff);
}

interface SidebarContainerProps {
  width: number;
  height: number;
  isFocused?: boolean;
  children: React.ReactNode;
}

/**
 * Top-level container box for right sidebars with VS Code style borders and zero padding
 * so that inner rows cleanly control 100% of cell backgrounds.
 */
export const SidebarContainer: React.FC<SidebarContainerProps> = ({
  width,
  height,
  isFocused = false,
  children,
}) => {
  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      borderStyle="round"
      borderColor={isFocused ? theme.colors.borderFocus : theme.colors.sidebarBorder}
      paddingX={0}
      paddingY={0}
    >
      {children}
    </Box>
  );
};

export interface TextItem {
  text: string;
  color?: string;
  bold?: boolean;
  dimColor?: boolean;
}

interface SidebarTwoColumnRowProps {
  left: TextItem;
  right: TextItem;
  width: number;
}

/**
 * Renders a full-width line with left content and right content,
 * ensuring all characters including the gap have the VS Code background color.
 */
export const SidebarTwoColumnRow: React.FC<SidebarTwoColumnRowProps> = ({
  left,
  right,
  width,
}) => {
  const panelBg = theme.colors.sidebarBg;
  const maxAvail = Math.max(10, width - 2);
  const rightW = stringWidth(right.text);
  const leftMaxW = Math.max(4, maxAvail - rightW - 1);
  const leftText = truncateVisual(left.text, leftMaxW);
  const leftW = stringWidth(leftText);
  const gap = Math.max(1, maxAvail - leftW - rightW);

  return (
    <Box flexDirection="row" width={width} height={1} overflow="hidden">
      <Text backgroundColor={panelBg}> </Text>
      <Text
        backgroundColor={panelBg}
        color={left.color || theme.colors.text}
        bold={left.bold}
        dimColor={left.dimColor}
      >
        {leftText}
      </Text>
      <Text backgroundColor={panelBg}>{" ".repeat(gap)}</Text>
      <Text
        backgroundColor={panelBg}
        color={right.color || theme.colors.text}
        bold={right.bold}
        dimColor={right.dimColor}
      >
        {right.text}
      </Text>
      <Text backgroundColor={panelBg}> </Text>
    </Box>
  );
};

interface SidebarDividerProps {
  width: number;
}

/**
 * Renders a full-width subtle separator line with the VS Code panel background.
 */
export const SidebarDivider: React.FC<SidebarDividerProps> = ({ width }) => {
  const panelBg = theme.colors.sidebarBg;
  return (
    <Box flexDirection="row" width={width} height={1} overflow="hidden">
      <Text backgroundColor={panelBg} color={theme.colors.sidebarDivider}>
        {"─".repeat(Math.max(0, width))}
      </Text>
    </Box>
  );
};

export interface TableColumnDef {
  text: string;
  width: number;
  color?: string;
  bold?: boolean;
  dimColor?: boolean;
  align?: "left" | "right";
}

interface SidebarTableRowProps {
  columns: TableColumnDef[];
  width: number;
}

/**
 * Renders a full-width table row where each column is padded and every cell
 * plus the trailing space is covered with the VS Code panel background.
 */
export const SidebarTableRow: React.FC<SidebarTableRowProps> = ({ columns, width }) => {
  const panelBg = theme.colors.sidebarBg;
  const avail = Math.max(10, width - 2);
  const used = columns.reduce((acc, c) => acc + c.width, 0);
  const trailGap = Math.max(0, avail - used);

  return (
    <Box flexDirection="row" width={width} height={1} overflow="hidden">
      <Text backgroundColor={panelBg}> </Text>
      {columns.map((col, idx) => (
        <Text
          key={idx}
          backgroundColor={panelBg}
          color={col.color || theme.colors.text}
          bold={col.bold}
          dimColor={col.dimColor}
        >
          {padVisual(col.text, col.width, col.align)}
        </Text>
      ))}
      <Text backgroundColor={panelBg}>{" ".repeat(trailGap)} </Text>
    </Box>
  );
};

interface SidebarLineProps {
  text: string;
  width: number;
  color?: string;
  bold?: boolean;
  dimColor?: boolean;
}

/**
 * Renders a single full-width line with the VS Code panel background.
 */
export const SidebarLine: React.FC<SidebarLineProps> = ({
  text,
  width,
  color,
  bold,
  dimColor,
}) => {
  const panelBg = theme.colors.sidebarBg;
  const avail = Math.max(4, width - 2);
  const truncated = truncateVisual(text, avail);
  const remaining = Math.max(0, avail - stringWidth(truncated));

  return (
    <Box flexDirection="row" width={width} height={1} overflow="hidden">
      <Text backgroundColor={panelBg}> </Text>
      <Text
        backgroundColor={panelBg}
        color={color || theme.colors.text}
        bold={bold}
        dimColor={dimColor}
      >
        {truncated}
      </Text>
      <Text backgroundColor={panelBg}>{" ".repeat(remaining)} </Text>
    </Box>
  );
};

interface SidebarLoadingRowProps {
  suffix: string;
  width: number;
}

/**
 * Renders an animated loader row constrained to exactly height 1 with the VS Code background.
 */
export const SidebarLoadingRow: React.FC<SidebarLoadingRowProps> = ({ suffix, width }) => {
  const panelBg = theme.colors.sidebarBg;
  return (
    <Box flexDirection="row" width={width} height={1} overflow="hidden">
      <Text backgroundColor={panelBg}> </Text>
      <ZigexLoader suffix={suffix} />
    </Box>
  );
};

interface SidebarEmptyRowsProps {
  count: number;
  width: number;
}

/**
 * Fills remaining vertical space with blank rows of the VS Code background color.
 */
export const SidebarEmptyRows: React.FC<SidebarEmptyRowsProps> = ({ count, width }) => {
  const panelBg = theme.colors.sidebarBg;
  if (count <= 0) return null;
  const emptyLine = " ".repeat(Math.max(0, width));

  return (
    <Box flexDirection="column">
      {Array.from({ length: count }).map((_, i) => (
        <Text key={i} backgroundColor={panelBg}>
          {emptyLine}
        </Text>
      ))}
    </Box>
  );
};
