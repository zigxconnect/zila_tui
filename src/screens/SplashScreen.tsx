import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { LilZilaBanner, LLAMA_ART, LIL_ZILA_TEXT } from "../ui/LilZilaBanner.js";
import { RetroMeter } from "../ui/RetroMeter.js";

interface SplashScreenProps {
  onComplete: () => void;
}

const BOOT_MESSAGES: Array<{ label: string; msg: string; status?: "ok" | "warn" }> = [
  { label: "BIOS",  msg: "ZILA-ROM v2.4 (C) 1994-2026 ZIGEX CORP",           status: "ok" },
  { label: "MEM ",  msg: "640 KB BASE OK  ·  16384 KB EXTENDED OK",           status: "ok" },
  { label: "CPU ",  msg: "INTEL 486DX2/66 — 90s EMULATION LAYER ACTIVE",      status: "ok" },
  { label: "BUS ",  msg: "BLUETOOTH BLE CONTROLLER [ONLINE]",                  status: "ok" },
  { label: "NET ",  msg: "TCP/IP ZIGEX-NET STACK INITIALIZED",                 status: "ok" },
  { label: "FS  ",  msg: "LOCAL WORKSPACE MOUNTED  [/home/intern]",            status: "ok" },
  { label: "API ",  msg: "GEMINI AI GATEWAY — HANDSHAKE COMPLETE",             status: "ok" },
  { label: "CACHE", msg: "LRU RESPONSE CACHE WARM  [0 ENTRIES]",              status: "ok" },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [frame, setFrame] = useState(0);

  const totalLines  = Math.max(LLAMA_ART.length, LIL_ZILA_TEXT.length);
  const totalFrames = totalLines + BOOT_MESSAGES.length + 4;

  useEffect(() => {
    if (frame >= totalFrames) {
      const timer = setTimeout(onComplete, 250);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setFrame((f) => f + 1);
    }, 26);

    return () => clearTimeout(timer);
  }, [frame, onComplete, totalFrames]);

  const bootStep   = Math.max(0, frame - totalLines);
  const visibleBoot = BOOT_MESSAGES.slice(0, bootStep);

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Animated reveal of pixel llama and lil-zila logo */}
      <LilZilaBanner maxLines={Math.min(frame, totalLines)} />

      {/* 90s CRT Boot Sequence Diagnostics */}
      {bootStep > 0 && (
        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="single"
          borderColor={theme.colors.retroCyan}
          paddingX={2}
          paddingY={0}
        >
          {/* Boot header */}
          <Box flexDirection="row" alignItems="center" marginBottom={0}>
            <Text color={theme.colors.retroCyanBright} bold>{"[ BOOT SEQUENCE ]"}</Text>
            <Text color={theme.colors.retroPanel}>{" ─────────────────────────────────────────"}</Text>
          </Box>

          {/* Boot messages */}
          {visibleBoot.map(({ label, msg, status }, i) => (
            <Box key={i} flexDirection="row" gap={1}>
              <Text color={theme.colors.retroSlateDark}>{"["}</Text>
              <Text color={status === "warn" ? theme.colors.retroAmberBright : theme.colors.retroGreenBright} bold>
                {status === "warn" ? "WARN" : " OK "}
              </Text>
              <Text color={theme.colors.retroSlateDark}>{"]"}</Text>
              <Text color={theme.colors.retroSlate}>{label}</Text>
              <Text color={theme.colors.retroPanel}>{"·"}</Text>
              <Text color={theme.colors.retroSlateDark}>{msg}</Text>
            </Box>
          ))}

          {/* Progress meter */}
          <Box marginTop={1} flexDirection="row" alignItems="center" gap={2}>
            <Text color={theme.colors.retroSlateDark}>{"INITIALIZING"}</Text>
            <RetroMeter
              value={bootStep}
              max={BOOT_MESSAGES.length}
              width={28}
              style="blocks"
              color="retroCyan"
              showPercent
            />
          </Box>
        </Box>
      )}

      {/* Final ready message */}
      {frame >= totalFrames - 2 && (
        <Box marginTop={1} flexDirection="row" gap={1}>
          <Text color={theme.colors.retroCyan}>{"╔═["}</Text>
          <Text color={theme.colors.retroGreenBright} bold>{"SYSTEM READY"}</Text>
          <Text color={theme.colors.retroCyan}>{"]"}</Text>
          <Text color={theme.colors.retroPanel}>{"═══"}</Text>
          <Text color={theme.colors.retroSlate}>{"lil-zila v0.3.0"}</Text>
          <Text color={theme.colors.retroPanel}>{"·"}</Text>
          <Text color={theme.colors.retroSlateDark}>{"AUTHENTIC 90S RETRO-TERMINAL"}</Text>
          <Text color={theme.colors.retroCyan}>{"═╗"}</Text>
        </Box>
      )}
    </Box>
  );
};
