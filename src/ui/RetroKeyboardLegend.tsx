import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface KeyBinding {
  key: string;
  label: string;
}

export interface RetroKeyboardLegendProps {
  bindings: KeyBinding[];
  /** Show in a single horizontal row (default) or wrapped */
  wrap?: boolean;
  /** Color for key caps — defaults to retroCyanBright */
  keyColor?: keyof typeof theme.colors;
  /** Color for labels — defaults to retroSlateDark */
  labelColor?: keyof typeof theme.colors;
}

/**
 * RetroKeyboardLegend — 90s Norton Commander-style function key legend.
 *
 * Example output:
 *   [F1]:HELP  [F2]:INIT  [ENTER]:SELECT  [ESC]:BACK  [^C]:QUIT
 */
export const RetroKeyboardLegend: React.FC<RetroKeyboardLegendProps> = ({
  bindings,
  wrap = false,
  keyColor = "retroCyanBright",
  labelColor = "retroSlateDark",
}) => {
  const kc = theme.colors[keyColor] || theme.colors.retroCyanBright;
  const lc = theme.colors[labelColor] || theme.colors.retroSlateDark;

  return (
    <Box flexDirection="row" flexWrap={wrap ? "wrap" : "nowrap"} gap={0} alignItems="center">
      {bindings.map(({ key, label }, i) => (
        <Box key={key + i} flexDirection="row" alignItems="center">
          {i > 0 && <Text color={theme.colors.retroPanel}>{"  "}</Text>}
          <Text color={theme.colors.retroPanel}>{"["}</Text>
          <Text color={kc} bold>{key}</Text>
          <Text color={theme.colors.retroPanel}>{"]"}</Text>
          <Text color={lc}>{":" + label}</Text>
        </Box>
      ))}
    </Box>
  );
};
