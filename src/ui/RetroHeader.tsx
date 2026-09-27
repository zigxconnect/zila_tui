import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface RetroHeaderProps {
  /** Primary title — shown bold in amber */
  title: string;
  /** Secondary subtitle — shown dim after a · separator */
  subtitle?: string;
  /** Right-side status tag, e.g. "ONLINE", "16 RECORDS" */
  statusTag?: string;
  /** Color of the status tag — defaults to retroGreenBright */
  statusColor?: keyof typeof theme.colors;
  /** Use double═══ rule (default) or single─── rule */
  double?: boolean;
  /** Screen width for the top/bottom rule */
  width?: number;
}

/**
 * RetroHeader — Reusable 90s workstation screen header.
 *
 *  ══════════════════════════════════════════════════════════════
 *  ▓▓  [ TITLE ]  ·  subtitle                         [ STATUS ]
 *  ══════════════════════════════════════════════════════════════
 */
export const RetroHeader: React.FC<RetroHeaderProps> = ({
  title,
  subtitle,
  statusTag,
  statusColor = "retroGreenBright",
  double = true,
  width = 72,
}) => {
  const ch = double ? "═" : "─";
  const ruleColor = theme.colors.retroCyan;
  const tagColor  = theme.colors[statusColor] || theme.colors.retroGreenBright;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top rule */}
      <Text color={ruleColor}>{ch.repeat(width)}</Text>

      {/* Identity row */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        {/* Left: prefix + title + subtitle */}
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text color={theme.colors.retroCyanBright} bold>{"▓▓"}</Text>
          <Text color={theme.colors.retroCyan}>{"["}</Text>
          <Text color={theme.colors.retroAmberBright} bold>{title.toUpperCase()}</Text>
          <Text color={theme.colors.retroCyan}>{"]"}</Text>
          {subtitle && (
            <>
              <Text color={theme.colors.retroPanel}>{"·"}</Text>
              <Text color={theme.colors.retroSlateDark}>{subtitle}</Text>
            </>
          )}
        </Box>

        {/* Right: status tag */}
        {statusTag && (
          <Box flexDirection="row" gap={0}>
            <Text color={theme.colors.retroPanel}>{"[ "}</Text>
            <Text color={tagColor} bold>{statusTag.toUpperCase()}</Text>
            <Text color={theme.colors.retroPanel}>{" ]"}</Text>
          </Box>
        )}
      </Box>

      {/* Bottom rule */}
      <Text color={ruleColor}>{ch.repeat(width)}</Text>
    </Box>
  );
};
