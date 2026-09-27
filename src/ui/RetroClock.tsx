import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export interface RetroClockProps {
  /** Color for the time digits — defaults to retroCyanBright */
  color?: keyof typeof theme.colors;
  /** Show seconds (default true) */
  showSeconds?: boolean;
  /** Show date prefix (default false) */
  showDate?: boolean;
  /** Show bracket wrapper [HH:MM:SS] (default true) */
  brackets?: boolean;
}

/**
 * RetroClock — Live updating clock component for the 90s workstation HUD.
 * Updates every second with the current local time.
 *
 * Example outputs:
 *   [14:22:07]
 *   [2026-09-27  14:22:07]
 */
export const RetroClock: React.FC<RetroClockProps> = ({
  color = "retroCyanBright",
  showSeconds = true,
  showDate = false,
  brackets = true,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const timeStr = [
    pad(now.getHours()),
    pad(now.getMinutes()),
    ...(showSeconds ? [pad(now.getSeconds())] : []),
  ].join(":");

  const dateStr = showDate
    ? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}  `
    : "";

  const display = `${dateStr}${timeStr}`;
  const tc = theme.colors[color] || theme.colors.retroCyanBright;

  if (!brackets) {
    return <Text color={tc} bold>{display}</Text>;
  }

  return (
    <Box flexDirection="row">
      <Text color={theme.colors.retroPanel}>{"["}</Text>
      <Text color={tc} bold>{display}</Text>
      <Text color={theme.colors.retroPanel}>{"]"}</Text>
    </Box>
  );
};
