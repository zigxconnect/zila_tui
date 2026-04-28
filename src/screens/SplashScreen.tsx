/**
 * src/screens/SplashScreen.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Animated boot splash shown once when ZILA starts.
 *
 * ANIMATION SEQUENCE (~700 ms total)
 * ───────────────────────────────────
 *  0 ms    First logo line appears
 * +55 ms   Each subsequent logo line stagger
 * +330 ms  Full name + version fade in
 * +430 ms  Tagline appears
 * +600 ms  Divider appears + onComplete() fires → shell prompt shows
 *
 * The invisible placeholder lines (spaces) keep the layout stable while
 * lines are still animating in, preventing the rest of the UI from jumping.
 *
 * MODIFYING THE LOGO
 * ──────────────────
 * Edit the LOGO_LINES array. Use a block-letter generator that produces
 * box-drawing characters. Keep lines ≤ 40 chars for 80-col terminal safety.
 */

import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { Divider } from "../ui/Divider.js";

const LOGO_LINES = [
  "  ███████╗██╗██╗      █████╗ ",
  "     ███╔╝██║██║     ██╔══██╗",
  "    ███╔╝ ██║██║     ███████║",
  "   ███╔╝  ██║██║     ██╔══██║",
  "  ███████╗██║███████╗██║  ██║",
  "  ╚══════╝╚═╝╚══════╝╚═╝  ╚═╝",
];

const TOTAL_LINES   = LOGO_LINES.length;
const STAGGER_MS    = theme.timing.splashStaggerMs;
const NAME_DELAY_MS = STAGGER_MS * TOTAL_LINES + 30;
const TAG_DELAY_MS  = NAME_DELAY_MS + 100;
const DONE_DELAY_MS = TAG_DELAY_MS + 170;

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showName,     setShowName]     = useState(false);
  const [showTagline,  setShowTagline]  = useState(false);
  const [showDivider,  setShowDivider]  = useState(false);

  useEffect(() => {
    // Stagger each logo line
    const lineTimers = LOGO_LINES.map((_, i) =>
      setTimeout(() => setVisibleLines(i + 1), STAGGER_MS * i),
    );
    const nameTimer    = setTimeout(() => setShowName(true),    NAME_DELAY_MS);
    const taglineTimer = setTimeout(() => setShowTagline(true), TAG_DELAY_MS);
    const doneTimer    = setTimeout(() => {
      setShowDivider(true);
      onComplete();
    }, DONE_DELAY_MS);

    return () => {
      lineTimers.forEach(clearTimeout);
      clearTimeout(nameTimer);
      clearTimeout(taglineTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Logo — visible lines render in colour, hidden lines are spaces */}
      {LOGO_LINES.map((line, i) => (
        <Text key={i} color={theme.colors.primary} bold>
          {i < visibleLines ? line : " "}
        </Text>
      ))}

      {/* Name + version */}
      <Box marginTop={1} flexDirection="row" gap={1}>
        <Text color={showName ? theme.colors.white : ""} bold>
          {showName ? "ZILA" : " "}
        </Text>
        <Text color={showName ? theme.colors.muted : ""}>
          {showName ? "v0.2.0" : ""}
        </Text>
      </Box>

      {/* Tagline */}
      <Text color={showTagline ? theme.colors.dim : ""}>
        {showTagline ? "Zigex Intelligent Layer for Agents" : " "}
      </Text>

      {/* Divider — appears last, signals the shell to show the prompt */}
      {showDivider && <Divider />}
    </Box>
  );
};
