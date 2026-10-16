import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export type RetroSpinnerStyle = "classic" | "radar" | "block" | "pulse" | "braille";

interface SpinnerProps {
  color?: string;
  style?: RetroSpinnerStyle;
  label?: string;
}

const SPINNER_FRAMES: Record<RetroSpinnerStyle, string[]> = {
  classic: ["-", "\\", "|", "/"],
  radar: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  block: ["▖", "▘", "▝", "▗"],
  pulse: ["◐", "◓", "◑", "◒"],
  braille: ["⠋", "⠙", "⠚", "⠞", "⠖", "⠦", "⠴", "⠲", "⠳", "⠓"],
};

export const Spinner: React.FC<SpinnerProps> = ({
  color = theme.colors.accent,
  style = "classic",
  label,
}) => {
  const [frame, setFrame] = useState(0);
  const frames = SPINNER_FRAMES[style] || SPINNER_FRAMES.classic;

  useEffect(() => {
    const id = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 90);
    return () => clearInterval(id);
  }, [frames.length]);

  return (
    <Box flexDirection="row" alignItems="center">
      <Text color={color} bold>{frames[frame]}</Text>
      {label && (
        <Box marginLeft={1}>
          <Text color={theme.colors.muted}>{label}</Text>
        </Box>
      )}
    </Box>
  );
};

export const DEFAULT_ZIGEX_VERBS: string[] = [
  "zigging",
  "zigxing",
  "zigexxing",
  "zixin",
  "zagging",
  "pondering",
  "synthesizing",
  "calibrating",
  "reasoning",
  "auditing",
  "indexing",
];

export interface ZigexLoaderProps {
  verbs?: string[];
  suffix?: string;
  color?: string;
  spinnerColor?: string;
  style?: RetroSpinnerStyle;
  intervalMs?: number;
}

export const ZigexLoader: React.FC<ZigexLoaderProps> = ({
  verbs = DEFAULT_ZIGEX_VERBS,
  suffix = "",
  color = theme.colors.retroAmberBright,
  spinnerColor = theme.colors.retroCyanBright,
  style = "braille",
  intervalMs = 700,
}) => {
  const [verbIndex, setVerbIndex] = useState(0);

  useEffect(() => {
    if (!verbs.length) return;
    const timer = setInterval(() => {
      setVerbIndex((prev) => (prev + 1) % verbs.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [verbs.length, intervalMs]);

  const currentVerb = verbs[verbIndex] || "zigging";

  return (
    <Box flexDirection="row" alignItems="center" gap={1}>
      <Spinner style={style} color={spinnerColor} />
      <Text color={color} bold>
        {currentVerb}
      </Text>
      {suffix ? <Text color={theme.colors.retroSlateDark}>{suffix}</Text> : null}
      <Text color={theme.colors.retroSlateDark}>...</Text>
    </Box>
  );
};
