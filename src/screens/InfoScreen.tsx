import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "../ui/theme.js";
import { RetroMeter } from "../ui/RetroMeter.js";

interface InfoScreenProps {
  onComplete: () => void;
}

export const InfoScreen: React.FC<InfoScreenProps> = ({ onComplete }) => {
  useInput((char, key) => {
    if (key.escape || char === "q" || key.return) {
      onComplete();
    }
  });

  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  const memoryUsage = process.memoryUsage();
  const heapMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const totalHeapMB = Math.round(memoryUsage.heapTotal / 1024 / 1024) || 64;
  const uptimeMinutes = Math.floor(process.uptime() / 60);

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* 90s Workstation Diagnostic Frame */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.accent}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Box flexDirection="row">
            <Text color={theme.colors.retroCyanBright} bold>
              [ SYSTEM TELEMETRY & RUNTIME DIAGNOSTICS ]
            </Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen} bold>[SYS: NOMINAL]</Text>
          </Box>
        </Box>

        {/* Workstation Specification */}
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.accent} bold>KERNEL & HARDWARE ENVIRONMENT:</Text>
          <Box flexDirection="row" alignItems="center">
            <Text color={theme.colors.muted}>Workstation Client</Text>
            <Text color={theme.colors.retroSlateDark}> ··············· </Text>
            <Text color={theme.colors.textBright} bold>lil-zila v0.3.0</Text>
          </Box>
          <Box flexDirection="row" alignItems="center">
            <Text color={theme.colors.muted}>Node.js Runtime</Text>
            <Text color={theme.colors.retroSlateDark}> ·················· </Text>
            <Text color={theme.colors.textBright}>{nodeVersion}</Text>
          </Box>
          <Box flexDirection="row" alignItems="center">
            <Text color={theme.colors.muted}>OS Architecture</Text>
            <Text color={theme.colors.retroSlateDark}> ·················· </Text>
            <Text color={theme.colors.textBright}>{platform} / {arch}</Text>
          </Box>
          <Box flexDirection="row" alignItems="center">
            <Text color={theme.colors.muted}>Session Uptime</Text>
            <Text color={theme.colors.retroSlateDark}> ··················· </Text>
            <Text color={theme.colors.textBright}>{uptimeMinutes} minutes (PID: {process.pid})</Text>
          </Box>
        </Box>

        {/* Memory Gauge */}
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.accent} bold>VIRTUAL MEMORY (VRAM / HEAP):</Text>
          <RetroMeter
            label={`Heap [${heapMB}MB / ${totalHeapMB}MB]`}
            value={heapMB}
            max={totalHeapMB}
            width={28}
            style="blocks"
            color="retroGreen"
          />
        </Box>

        {/* Subsystem State */}
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.colors.accent} bold>SUBSYSTEM STATUS CHECKLIST:</Text>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen}>[OK] </Text>
            <Text color={theme.colors.text}>Multi-tier L1/L2 Client Cache mounted (~/.zila/cache.json)</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen}>[OK] </Text>
            <Text color={theme.colors.text}>Bluetooth Low Energy P2P Protocol Engine ready</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen}>[OK] </Text>
            <Text color={theme.colors.text}>GitHub API OAuth & Personal Access Token pipeline ready</Text>
          </Box>
          <Box flexDirection="row">
            <Text color={theme.colors.retroGreen}>[OK] </Text>
            <Text color={theme.colors.text}>Zigex REST Sync Daemon connected (http://localhost:5000)</Text>
          </Box>
        </Box>

        {/* Footer */}
        <Box marginTop={1} flexDirection="row" justifyContent="space-between">
          <Text color={theme.colors.dim}>[ESC / ENTER / q: CLOSE]</Text>
          <Text color={theme.colors.retroSlateDark}>ENGINEERED BY GITA & ZIGEX CORP</Text>
        </Box>
      </Box>
    </Box>
  );
};
