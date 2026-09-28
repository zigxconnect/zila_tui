import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface RetroHeaderProps {
  /** Primary title — shown bold in white */
  title: string;
  /** Secondary subtitle — shown dim after a · separator */
  subtitle?: string;
  /** Right-side status tag, e.g. "ONLINE", "16 RECORDS" */
  statusTag?: string;
  /** Color of the status tag — defaults to retroGreenBright */
  statusColor?: keyof typeof theme.colors;
  /** Use double═══ rule or single─── rule (default false) */
  double?: boolean;
  /** Screen width for the top/bottom rule */
  width?: number;
}

/**
 * RetroHeader — Clean Zigex workstation screen header.
 *
 *  ──────────────────────────────────────────────────────────────
 *  lil-zila › TITLE  ·  subtitle                       [ STATUS ]
 *  ──────────────────────────────────────────────────────────────
 */
export const RetroHeader: React.FC<RetroHeaderProps> = ({
  title,
  subtitle,
  statusTag,
  statusColor = "retroGreenBright",
  double = false,
  width = 72,
}) => {
  const ch = double ? "═" : "─";
  const ruleColor = theme.colors.retroBlue;
  const tagColor  = theme.colors[statusColor] || theme.colors.retroGreenBright;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top rule */}
      <Text color={ruleColor}>{ch.repeat(width)}</Text>

      {/* Identity row */}
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        {/* Left: branding + title + subtitle */}
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"›"}</Text>
          <Text color={theme.colors.white} bold>{title}</Text>
          {subtitle && (
            <>
              <Text color={theme.colors.retroSlateDark}>{"·"}</Text>
              <Text color={theme.colors.retroSlateDark}>{subtitle}</Text>
            </>
          )}
        </Box>

        {/* Right: status tag */}
        {statusTag && (
          <Text color={tagColor} bold>{statusTag}</Text>
        )}
      </Box>

      {/* Bottom rule */}
      <Text color={ruleColor}>{ch.repeat(width)}</Text>
    </Box>
  );
};
