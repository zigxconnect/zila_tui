import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { LilZilaBanner, LLAMA_ART, LIL_ZILA_TEXT } from "../ui/LilZilaBanner.js";

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [frame, setFrame] = useState(0);

  const totalLines = Math.max(LLAMA_ART.length, LIL_ZILA_TEXT.length);
  const totalFrames = totalLines + 5;

  useEffect(() => {
    if (frame >= totalFrames) {
      const timer = setTimeout(onComplete, 250);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setFrame((f) => f + 1);
    }, 30);

    return () => clearTimeout(timer);
  }, [frame, onComplete, totalFrames]);

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Animated reveal of pixel llama and lil-zila logo */}
      <LilZilaBanner maxLines={Math.min(frame, totalLines)} />

      {/* Sleek status indicator (no emojis) */}
      {frame >= totalLines && (
        <Box marginTop={1} flexDirection="row" alignItems="center">
          <Text color={theme.colors.accent} bold>
            {theme.symbols.pointer}{" "}
          </Text>
          <Text color={theme.colors.muted}>
            Initializing workspace environment...
          </Text>
        </Box>
      )}

      {/* Version footer */}
      {frame >= totalLines + 2 && (
        <Box marginTop={1}>
          <Text color={theme.colors.dim} dimColor>
            v0.3.0 [lil-zila] • Zigex Intelligence Terminal
          </Text>
        </Box>
      )}
    </Box>
  );
};
