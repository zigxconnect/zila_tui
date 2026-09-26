import React from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

export const LLAMA_ART = [
  "    ▄▄      ▄     ",
  "  ▄███    ▄███    ",
  "  ███▀  ▄███▀     ",
  "  ███▄█████▄▄▄    ",
  "   ██▀▀▀▀▀▀▀▀▀▀▀  ",
  "  ▄██ █▀ ██ █▀▄▄▄ ",
  " █████▄▄▄▄▄▄█████ ",
  " ████████▀▀▀▀▀▀   ",
  " █████████ █      ",
  "▄█████████▄█      ",
  "████████████      ",
  "████████████      ",
  " ██████████       ",
  "   ███████        ",
];

export const LIL_ZILA_TEXT = [
  "",
  "",
  "▄▄▄▄      ▄▄▄    ▄▄▄▄                         ▄▄    ▄▄▄▄           ",
  "████      ███    ████                         ██    ████           ",
  "  ██     ▄▄▄▄      ██              ▄▄▄▄▄▄▄  ▄▄▄▄      ██      ▄▄▄▄ ",
  "  ██     ▀███      ██    ▄▄▄▄▄▄▄▄  ▀▀▀▀███  ▀▀██      ██      ▀▀▀█▄",
  "  ██      ███      ██    ████████    ▄▄█▀▀    ██      ██      ▄▄▄██",
  "  ██      ███      ██              ███▀▀      ██      ██    ███▀▀██",
  "██████   ██████  ██████            ███████  ██████  ██████  ▀▀█████",
  "",
  "  > your agentic terminal",
];

interface LilZilaBannerProps {
  maxLines?: number;
}

export const LilZilaBanner: React.FC<LilZilaBannerProps> = ({ maxLines }) => {
  const rowCount = Math.max(LLAMA_ART.length, LIL_ZILA_TEXT.length);
  const rowsToDisplay = maxLines !== undefined ? Math.min(maxLines, rowCount) : rowCount;

  return (
    <Box flexDirection="column" marginY={1}>
      {Array.from({ length: rowsToDisplay }).map((_, i) => {
        const defaultLlamaLen = LLAMA_ART[0]?.length || 18;
        const llamaLine = (i < LLAMA_ART.length ? LLAMA_ART[i] : null) || " ".repeat(defaultLlamaLen);
        const textLine = (i < LIL_ZILA_TEXT.length ? LIL_ZILA_TEXT[i] : null) || "";
        const isTagline = textLine.includes("> your agentic terminal");

        return (
          <Box key={i} flexDirection="row">
            <Text color={theme.colors.logoColor}>{llamaLine}</Text>
            <Box marginLeft={3}>
              {isTagline ? (
                <Box>
                  <Text color={theme.colors.accent} bold>
                    {"> "}
                  </Text>
                  <Text color={theme.colors.muted}>
                    your agentic terminal
                  </Text>
                </Box>
              ) : (
                <Text color={theme.colors.logoColor} bold>
                  {textLine}
                </Text>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
