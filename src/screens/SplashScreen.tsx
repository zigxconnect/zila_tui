import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [frame, setFrame] = useState(0);

  // Full-width logo design
  const logo = [
    "════════════════════════════════════════════════════════════════════════════════════════════════════════════════",
    "                                                                                                                ",
    "                ███████╗ ██╗ ██╗      █████╗          █████╗   ██████╗  ███████╗ ███╗   ██╗ ████████╗        ",
    "                ╚══███╔╝ ██║ ██║     ██╔══██╗        ██╔══██╗ ██╔════╝  ██╔════╝ ████╗  ██║ ╚══██╔══╝        ",
    "                  ███╔╝  ██║ ██║     ███████║ █████╗ ███████║ ██║  ███╗ █████╗   ██╔██╗ ██║    ██║           ",
    "                 ███╔╝   ██║ ██║     ██╔══██║ ╚════╝ ██╔══██║ ██║   ██║ ██╔══╝   ██║╚██╗██║    ██║           ",
    "                ███████╗ ██║ ███████╗██║  ██║        ██║  ██║ ╚██████╔╝ ███████╗ ██║ ╚████║    ██║           ",
    "                ╚══════╝ ╚═╝ ╚══════╝╚═╝  ╚═╝        ╚═╝  ╚═╝  ╚═════╝  ╚══════╝ ╚═╝  ╚═══╝    ╚═╝           ",
    "                                                                                                                ",
    "                              Zigex Intelligent Layer for Agents                                               ",
    "                         Terminal-First Internship & Program Management                                        ",
    "                                                                                                                ",
    "════════════════════════════════════════════════════════════════════════════════════════════════════════════════",
  ];

  const taglines = [
    "🚀 Empowering your internship journey...",
    "✨ Connecting you with opportunities...",
    "🎯 Building your future, one task at a time...",
  ];

  const randomTagline = taglines[Math.floor(Math.random() * taglines.length)];

  const totalFrames = logo.length + 8;

  useEffect(() => {
    if (frame >= totalFrames) {
      const timer = setTimeout(onComplete, 400);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setFrame(frame + 1);
    }, theme.timing.splashStaggerMs);

    return () => clearTimeout(timer);
  }, [frame, onComplete, totalFrames]);

  const getColor = (lineIndex: number) => {
    // Color scheme for different parts of the logo
    if (lineIndex === 0 || lineIndex === 12) {
      return theme.colors.primary; // Top and bottom borders
    }
    if (lineIndex >= 2 && lineIndex <= 7) {
      // Main logo text with gradient
      const colors = [
        theme.colors.primaryBright,
        theme.colors.primary,
        theme.colors.accent,
        theme.colors.accentBright,
        theme.colors.primary,
        theme.colors.primaryBright,
      ];
      return colors[(lineIndex - 2) % colors.length];
    }
    if (lineIndex === 9 || lineIndex === 10) {
      return theme.colors.accent; // Subtitle text
    }
    return theme.colors.border;
  };

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" paddingY={2}>
      {/* Logo with animated reveal */}
      <Box flexDirection="column">
        {logo.slice(0, Math.min(frame, logo.length)).map((line, index) => {
          const isTitle = index >= 2 && index <= 7;
          const isSubtitle = index === 9 || index === 10;

          return (
            <Box key={index}>
              <Text
                bold={isTitle || isSubtitle}
                color={getColor(index)}
              >
                {line}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Tagline with fade in */}
      {frame > logo.length && (
        <Box marginTop={1}>
          <Text color={theme.colors.muted} italic>
            {randomTagline}
          </Text>
        </Box>
      )}

      {/* Loading indicator */}
      {frame > logo.length + 2 && (
        <Box marginTop={2}>
          <Text color={theme.colors.primary}>
            {theme.spinners.pulse.frames[frame % theme.spinners.pulse.frames.length]}{" "}
            Loading your workspace...
          </Text>
        </Box>
      )}

      {/* Version info */}
      {frame > logo.length + 4 && (
        <Box marginTop={2} flexDirection="column" alignItems="center">
          <Text color={theme.colors.dimmer} dimColor>
            v0.2.0 • Powered by Zigex Open Source Initiative
          </Text>
        </Box>
      )}
    </Box>
  );
};
