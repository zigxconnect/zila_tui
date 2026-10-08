import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

interface PipelineLoaderProps {
  label?: string;
  width?: number;
}

/**
 * A smooth blue horizontal animated loader bar for the pipeline submitting state.
 * Uses a bouncing fill segment that sweeps left-to-right then right-to-left.
 */
export const PipelineLoader: React.FC<PipelineLoaderProps> = ({
  label,
  width = 40,
}) => {
  const segmentLen = Math.max(6, Math.floor(width * 0.25));
  const trackLen = width - segmentLen;
  const [pos, setPos] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setPos((prev) => {
        const next = prev + dir;
        if (next >= trackLen || next <= 0) setDir((d) => -d);
        return Math.max(0, Math.min(trackLen, next));
      });
    }, 40);
    return () => clearInterval(id);
  }, [dir, trackLen]);

  const before = "─".repeat(pos);
  const fill = "━".repeat(segmentLen);
  const after = "─".repeat(Math.max(0, trackLen - pos));

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={0}>
          <Text color={theme.colors.retroBlueBright} bold>
            {label}
          </Text>
        </Box>
      )}
      <Box flexDirection="row" alignItems="center">
        <Text color={theme.colors.retroSlateDark}>{"["}</Text>
        <Text color={theme.colors.retroSlateDark}>{before}</Text>
        <Text color={theme.colors.retroBlueBright} bold>{fill}</Text>
        <Text color={theme.colors.retroSlateDark}>{after}</Text>
        <Text color={theme.colors.retroSlateDark}>{"]"}</Text>
      </Box>
    </Box>
  );
};
