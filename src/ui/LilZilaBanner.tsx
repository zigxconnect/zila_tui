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
  "  your agentic terminal  —  type  help  to begin",
];

interface LilZilaBannerProps {
  maxLines?: number;
  showFrame?: boolean;
}

export const LilZilaBanner: React.FC<LilZilaBannerProps> = ({
  maxLines,
  showFrame = true,
}) => {
  const rowCount = Math.max(LLAMA_ART.length, LIL_ZILA_TEXT.length);
  const rowsToDisplay = maxLines !== undefined ? Math.min(maxLines, rowCount) : rowCount;

  return (
    <Box flexDirection="column" marginY={1}>
      {/* Simple top rule */}
      {showFrame && (
        <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
      )}

      {/* Logo body */}
      <Box flexDirection="column" paddingX={showFrame ? 1 : 0}>
        {Array.from({ length: rowsToDisplay }).map((_, i) => {
          const defaultLen = LLAMA_ART[0]?.length || 18;
          const llamaLine  = (i < LLAMA_ART.length ? LLAMA_ART[i] : null) || " ".repeat(defaultLen);
          const textLine   = (i < LIL_ZILA_TEXT.length ? LIL_ZILA_TEXT[i] : null) || "";
          const isTagline  = textLine.includes("your agentic terminal");

          return (
            <Box key={i} flexDirection="row">
              {/* Logo art — sharp blue */}
              <Text color={theme.colors.retroBlue}>{llamaLine}</Text>
              <Box marginLeft={3}>
                {isTagline ? (
                  <Box flexDirection="row" gap={1}>
                    <Text color={theme.colors.retroSlateDark}>{"your agentic terminal"}</Text>
                    <Text color={theme.colors.retroSlateDark}>{"—  type"}</Text>
                    <Text color={theme.colors.white} bold>{"help"}</Text>
                    <Text color={theme.colors.retroSlateDark}>{"to begin"}</Text>
                  </Box>
                ) : (
                  /* Title text — white, bold */
                  <Text color={theme.colors.white} bold>{textLine}</Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Simple bottom rule + meta */}
      {showFrame && (
        <Box flexDirection="column">
          <Box flexDirection="row" gap={3} paddingX={1} marginTop={0}>
            <Text color={theme.colors.retroSlateDark}>{"v0.3.0"}</Text>
            <Text color={theme.colors.retroSlateDark}>{"·"}</Text>
            <Text color={theme.colors.retroSlateDark}>{"ZIGEX CORP"}</Text>
            <Text color={theme.colors.retroSlateDark}>{"·"}</Text>
            <Text color={theme.colors.retroGreenBright}>{"ONLINE"}</Text>
          </Box>
          <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
        </Box>
      )}
    </Box>
  );
};
