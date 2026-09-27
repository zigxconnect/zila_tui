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
  "  > your agentic terminal  ·  type  help  to begin",
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
      {/* ═══ TOP FRAME BAR ═══ */}
      {showFrame && (
        <Box flexDirection="row" alignItems="center">
          <Text color={theme.colors.retroCyan}>{"╔══[ "}</Text>
          <Text color={theme.colors.retroAmberBright} bold>{"LIL ZILA"}</Text>
          <Text color={theme.colors.retroSlate}>{" · "}</Text>
          <Text color={theme.colors.retroCyan} bold>{"WORKSTATION ENVIRONMENT"}</Text>
          <Text color={theme.colors.retroCyan}>{" ]"}</Text>
          <Text color={theme.colors.retroCyan}>{"═".repeat(20)}</Text>
          <Text color={theme.colors.retroCyan}>{"[ "}</Text>
          <Text color={theme.colors.retroGreenBright} bold>{"ONLINE"}</Text>
          <Text color={theme.colors.retroCyan}>{" ]══╗"}</Text>
        </Box>
      )}

      {/* ─── BODY: logo + title ─── */}
      <Box
        flexDirection="column"
        paddingX={showFrame ? 1 : 0}
        paddingY={0}
      >
        {Array.from({ length: rowsToDisplay }).map((_, i) => {
          const defaultLlamaLen = LLAMA_ART[0]?.length || 18;
          const llamaLine = (i < LLAMA_ART.length ? LLAMA_ART[i] : null) || " ".repeat(defaultLlamaLen);
          const textLine  = (i < LIL_ZILA_TEXT.length ? LIL_ZILA_TEXT[i] : null) || "";
          const isTagline = textLine.includes("> your agentic terminal");

          return (
            <Box key={i} flexDirection="row">
              <Text color={theme.colors.retroCyanBright}>{llamaLine}</Text>
              <Box marginLeft={3}>
                {isTagline ? (
                  <Box flexDirection="row">
                    <Text color={theme.colors.retroCyan} bold>{"  > "}</Text>
                    <Text color={theme.colors.retroSlate}>{"your agentic terminal"}</Text>
                    <Text color={theme.colors.retroSlateDark}>{"  ·  type  "}</Text>
                    <Text color={theme.colors.retroCyanBright} bold>{"help"}</Text>
                    <Text color={theme.colors.retroSlateDark}>{"  to begin"}</Text>
                  </Box>
                ) : (
                  <Text color={theme.colors.retroAmberBright} bold>
                    {textLine}
                  </Text>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ─── BOTTOM FRAME BAR ─── */}
      {showFrame && (
        <>
          {/* System stats row */}
          <Box flexDirection="row" gap={3} paddingX={1} marginTop={0}>
            <Text color={theme.colors.retroSlateDark}>{"SYSTEM:"}</Text>
            <Text color={theme.colors.retroSlate}>{"VT220/ANSI"}</Text>
            <Text color={theme.colors.retroPanel}>{"·"}</Text>
            <Text color={theme.colors.retroSlateDark}>{"RUNTIME:"}</Text>
            <Text color={theme.colors.retroSlate}>{"Node.js v20"}</Text>
            <Text color={theme.colors.retroPanel}>{"·"}</Text>
            <Text color={theme.colors.retroSlateDark}>{"NET:"}</Text>
            <Text color={theme.colors.retroGreenBright}>{"ZIGEX-NET SYNCED"}</Text>
            <Text color={theme.colors.retroPanel}>{"·"}</Text>
            <Text color={theme.colors.retroSlateDark}>{"VER:"}</Text>
            <Text color={theme.colors.retroCyan}>{"v0.3.0"}</Text>
          </Box>
          {/* Bottom border */}
          <Box flexDirection="row" alignItems="center">
            <Text color={theme.colors.retroCyan}>{"╚══[ "}</Text>
            <Text color={theme.colors.retroSlateDark}>{"READY FOR INPUT"}</Text>
            <Text color={theme.colors.retroCyan}>{" ]"}</Text>
            <Text color={theme.colors.retroCyan}>{"═".repeat(44)}</Text>
            <Text color={theme.colors.retroCyan}>{"╝"}</Text>
          </Box>
        </>
      )}
    </Box>
  );
};
