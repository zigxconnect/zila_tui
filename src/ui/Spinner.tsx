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
