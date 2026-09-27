import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { LilZilaBanner, LLAMA_ART, LIL_ZILA_TEXT } from "../ui/LilZilaBanner.js";
import { RetroMeter } from "../ui/RetroMeter.js";

interface SplashScreenProps {
  onComplete: () => void;
}

const BOOT_MESSAGES = [
  "BIOS: ZILA-ROM v2.4 (C) 1994-2026 ZIGEX CORP",
  "MEM:  640 KB BASE RAM OK · 16384 KB EXTENDED OK",
  "BUS:  BLUETOOTH BLE CONTROLLER [ONLINE]",
  "NET:  TCP/IP ZIGEX-NET STACK INITIALIZED",
  "FS:   LOCAL WORKSPACE ATTACHED [/home/intern]",
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [frame, setFrame] = useState(0);

  const totalLines = Math.max(LLAMA_ART.length, LIL_ZILA_TEXT.length);
  const totalFrames = totalLines + BOOT_MESSAGES.length + 3;

  useEffect(() => {
    if (frame >= totalFrames) {
      const timer = setTimeout(onComplete, 200);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setFrame((f) => f + 1);
    }, 28);

    return () => clearTimeout(timer);
  }, [frame, onComplete, totalFrames]);

  const bootStep = Math.max(0, frame - totalLines);

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
          borderColor={theme.colors.border}
          paddingX={1}
        >
          <Box flexDirection="row" alignItems="center">
            <Text color={theme.colors.accent} bold>[ BOOT SEQUENCE ] </Text>
            <Text color={theme.colors.dim}>────────────────────────────────────────</Text>
          </Box>
          {BOOT_MESSAGES.slice(0, bootStep).map((msg, i) => (
            <Box key={i} flexDirection="row">
              <Text color={theme.colors.retroGreen}>[OK] </Text>
              <Text color={theme.colors.retroSlate}>{msg}</Text>
            </Box>
          ))}
          <Box marginTop={1} flexDirection="row" alignItems="center">
            <RetroMeter
              label="INITIALIZING"
              value={bootStep}
              max={BOOT_MESSAGES.length}
              width={24}
              style="blocks"
              color="retroCyan"
            />
          </Box>
        </Box>
      )}

      {/* Version footer */}
      {frame >= totalFrames - 2 && (
        <Box marginTop={1} flexDirection="row">
          <Text color={theme.colors.retroSlateDark}>[ </Text>
          <Text color={theme.colors.textBright} bold>lil-zila v0.3.0</Text>
          <Text color={theme.colors.retroSlateDark}> │ </Text>
          <Text color={theme.colors.accent}>AUTHENTIC 90S RETRO-TERMINAL</Text>
          <Text color={theme.colors.retroSlateDark}> ]</Text>
        </Box>
      )}
    </Box>
  );
};
