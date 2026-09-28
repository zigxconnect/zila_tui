import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { theme } from "../ui/theme.js";
import { LilZilaBanner, LLAMA_ART, LIL_ZILA_TEXT } from "../ui/LilZilaBanner.js";
import { RetroMeter } from "../ui/RetroMeter.js";

interface SplashScreenProps {
  onComplete: () => void;
}

const BOOT_MESSAGES: Array<{ label: string; msg: string }> = [
  { label: "ROM",   msg: "ZILA-ROM v2.4 (C) 1994-2026 Zigex Corp" },
  { label: "MEM",   msg: "System memory 16 MB extended OK" },
  { label: "NET",   msg: "TCP/IP Zigex-Net stack online" },
  { label: "CACHE", msg: "Client cache warm (~/.zila/cache.json)" },
  { label: "BLE",   msg: "Bluetooth LE protocol initialized" },
  { label: "WS",    msg: "Workspace attached [/home/intern]" },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [frame, setFrame] = useState(0);

  const totalLines  = Math.max(LLAMA_ART.length, LIL_ZILA_TEXT.length);
  const totalFrames = totalLines + BOOT_MESSAGES.length + 3;

  useEffect(() => {
    if (frame >= totalFrames) {
      const timer = setTimeout(onComplete, 200);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setFrame((f) => f + 1);
    }, 22);

    return () => clearTimeout(timer);
  }, [frame, onComplete, totalFrames]);

  const bootStep   = Math.max(0, frame - totalLines);
  const visibleBoot = BOOT_MESSAGES.slice(0, bootStep);

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Animated reveal of pixel llama and lil-zila logo */}
      <LilZilaBanner maxLines={Math.min(frame, totalLines)} />

      {/* Boot Sequence */}
      {bootStep > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
          {visibleBoot.map(({ label, msg }, i) => (
            <Box key={i} flexDirection="row" gap={1}>
              <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
              <Box width={7}>
                <Text color={theme.colors.retroSlateDark}>{label}</Text>
              </Box>
              <Text color={theme.colors.white}>{msg}</Text>
            </Box>
          ))}

          {/* Meter */}
          <Box marginTop={1} flexDirection="row" alignItems="center" gap={2}>
            <Text color={theme.colors.retroSlateDark}>{"Loading:"}</Text>
            <RetroMeter
              value={bootStep}
              max={BOOT_MESSAGES.length}
              width={24}
              style="blocks"
              color="retroBlueBright"
              showPercent={true}
            />
          </Box>
          <Text color={theme.colors.retroBlue}>{"─".repeat(72)}</Text>
        </Box>
      )}

      {/* Ready line */}
      {frame >= totalFrames - 2 && (
        <Box marginTop={0} flexDirection="row" gap={1}>
          <Text color={theme.colors.retroGreenBright}>{"✓"}</Text>
          <Text color={theme.colors.retroBlue} bold>{"lil-zila"}</Text>
          <Text color={theme.colors.white}>{"workstation ready"}</Text>
        </Box>
      )}
    </Box>
  );
};
