import React, { useState, useEffect } from "react";
import { Text } from "ink";
import { theme } from "./theme.js";

export interface RetroTypingTextProps {
  /** The full text to display */
  text: string;
  /** Characters per frame (default 2) */
  speed?: number;
  /** Interval in ms between frames (default 30) */
  intervalMs?: number;
  /** Color of the text */
  color?: string;
  /** Bold */
  bold?: boolean;
  /** Called when typing is complete */
  onDone?: () => void;
}

/**
 * RetroTypingText — Renders text character-by-character, simulating a
 * vintage 1200-baud terminal connection printing to the screen.
 */
export const RetroTypingText: React.FC<RetroTypingTextProps> = ({
  text,
  speed = 2,
  intervalMs = 30,
  color = theme.colors.retroSlate,
  bold = false,
  onDone,
}) => {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= text.length) {
      onDone?.();
      return;
    }
    const id = setInterval(() => {
      setVisible((v) => {
        const next = Math.min(v + speed, text.length);
        return next;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [visible, text.length, speed, intervalMs, onDone]);

  return (
    <Text color={color} bold={bold}>
      {text.slice(0, visible)}
    </Text>
  );
};
