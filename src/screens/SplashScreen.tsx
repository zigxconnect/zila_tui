import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { Divider } from "../ui/Divider.js";

// Give me a more colorful version of LOGO_LINES with the same layout, using theme colors and bold text where appropriate.


const LOGO_LINES = [
  "  ███████╗██╗██╗      █████╗ ",
  "  ╚══███╔╝██║██║     ██╔══██╗",
  "    ███╔╝ ██║██║     ███████║",
  "   ███╔╝  ██║██║     ██╔══██║",
  "  ███████╗██║███████╗██║  ██║",
  "  ╚══════╝╚═╝╚══════╝╚═╝  ╚═╝",
];

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showTitle, setShowTitle] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [showDivider, setShowDivider] = useState(false);

  useEffect(() => {
    const lineInterval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= LOGO_LINES.length) {
          clearInterval(lineInterval);
          return prev;
        }
        return prev + 1;
      });
    }, theme.timing.splashStagger);
    const titleTimer = setTimeout(() => setShowTitle(true), 1000);
    const taglineTimer = setTimeout(() => setShowTagline(true), 800);
    const completeTimer = setTimeout(() => {
      setShowDivider(true);
      onComplete(); // Tells the Shell to render the prompt
    }, 2000);
    return () => {
      clearInterval(lineInterval);
      clearTimeout(titleTimer);
      clearTimeout(taglineTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {LOGO_LINES.slice(0, visibleLines).map((line, i) => (
        <Text key={i} color={theme.colors.primary} bold>
          {line}
        </Text>
      ))}
      {/* Keep layout stable while animating */}
      {LOGO_LINES.slice(visibleLines).map((_, i) => (
        <Text key={`hidden-${i}`}> </Text>
      ))}

      {showTitle && (
        <Box flexDirection="row">
          <Text color={theme.colors.white} bold>
            ZILA{" "}
          </Text>
          <Text color={theme.colors.muted}>v0.2.0</Text>
        </Box>
      )}

      {showTagline && (
        <Text color={theme.colors.dim}>Zigex Open Source Initiative</Text>
      )}

      {showDivider && <Divider />}
    </Box>
  );
};
