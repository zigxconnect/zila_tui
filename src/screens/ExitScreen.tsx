import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";

interface ExitScreenProps {
  message?: string;
  onExited: () => void;
}

export const ExitScreen: React.FC<ExitScreenProps> = ({ message, onExited }) => {
  const [frame, setFrame] = useState(0);

  const farewell = [
    "",
    "   ╔════════════════════════════════════════════╗",
    "   ║                                            ║",
    "   ║          Thanks for using ZILA!            ║",
    "   ║                                            ║",
    "   ║     Keep building amazing things 🚀        ║",
    "   ║                                            ║",
    "   ╚════════════════════════════════════════════╝",
    "",
  ];

  useEffect(() => {
    if (frame >= farewell.length + 2) {
      const timer = setTimeout(onExited, theme.timing.exitDelayMs);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setFrame(frame + 1);
    }, 60);

    return () => clearTimeout(timer);
  }, [frame, onExited]);

  return (
    <Box flexDirection="column" alignItems="center" paddingY={2}>
      {/* Custom exit message */}
      {message && frame > 0 && (
        <Box marginBottom={2}>
          <Text color={theme.colors.warning} italic>
            {message}
          </Text>
        </Box>
      )}

      {/* Animated farewell message */}
      <Box flexDirection="column">
        {farewell.slice(0, Math.min(frame, farewell.length)).map((line, index) => {
          const isBorder = index === 1 || index === 7;
          const isTitle = index === 3;

          return (
            <Box key={index}>
              <Text
                bold={isTitle}
                color={
                  isBorder
                    ? theme.colors.primary
                    : isTitle
                    ? theme.colors.primaryBright
                    : theme.colors.text
                }
              >
                {line}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Loading indicator */}
      {frame > farewell.length && (
        <Box marginTop={2}>
          <Text color={theme.colors.muted} dimColor>
            {theme.spinners.dots.frames[frame % theme.spinners.dots.frames.length]} Closing...
          </Text>
        </Box>
      )}

      {/* Version & link */}
      {frame > farewell.length && (
        <Box marginTop={2} flexDirection="column" alignItems="center">
          <Text color={theme.colors.dimmer} dimColor>
            Zila v0.2.0 • zigex.com
          </Text>
        </Box>
      )}
    </Box>
  );
};
