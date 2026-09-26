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
      {showFrame && (
        <Box flexDirection="row" alignItems="center">
          <Text color={theme.colors.border}>┌──[ </Text>
          <Text color={theme.colors.accentBright} bold>ZILA WORKSTATION ENVIRONMENT</Text>
          <Text color={theme.colors.border}> ]</Text>
          <Text color={theme.colors.border}>{"─".repeat(28)}</Text>
          <Text color={theme.colors.border}>[ </Text>
          <Text color={theme.colors.retroGreen} bold>ONLINE</Text>
          <Text color={theme.colors.border}> ]──┐</Text>
        </Box>
      )}

      <Box
        flexDirection="column"
        paddingX={showFrame ? 1 : 0}
        paddingY={0}
      >
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
                  <Box flexDirection="row">
                    <Text color={theme.colors.accent} bold>
                      {"> "}
                    </Text>
                    <Text color={theme.colors.muted}>
                      your agentic terminal
                    </Text>
                    <Text color={theme.colors.retroSlateDark}>
                      {"  │  "}
                    </Text>
                    <Text color={theme.colors.retroGreen}>
                      v0.3.0
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

      {showFrame && (
        <Box flexDirection="row" alignItems="center" marginTop={1}>
          <Text color={theme.colors.border}>└──[ </Text>
          <Text color={theme.colors.dim}>SYSTEM: VT220/ANSI</Text>
          <Text color={theme.colors.retroSlateDark}> │ </Text>
          <Text color={theme.colors.dim}>NODE: v20</Text>
          <Text color={theme.colors.retroSlateDark}> │ </Text>
          <Text color={theme.colors.dim}>ZIGEX-NET: SYNCED</Text>
          <Text color={theme.colors.border}> ]</Text>
          <Text color={theme.colors.border}>{"─".repeat(24)}</Text>
          <Text color={theme.colors.border}>┘</Text>
        </Box>
      )}
    </Box>
  );
};
